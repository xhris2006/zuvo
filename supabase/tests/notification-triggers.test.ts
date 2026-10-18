import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createDraft,
  addImage,
  createUser,
  expectDenied,
  expectError,
  suspendUser,
} from "./support/db";

type NotificationRow = {
  type: string;
  actor_id: string | null;
  listing_id: string | null;
  conversation_id: string | null;
  is_read: boolean;
};

async function notificationsOf(userId: string, type?: string) {
  const { rows } = await asOwner((sql) =>
    sql<NotificationRow>(
      `select type, actor_id, listing_id, conversation_id, is_read
       from public.notifications
       where user_id = $1 and ($2::public.notification_type is null or type = $2)
       order by created_at`,
      [userId, type ?? null],
    ),
  );
  return rows;
}

async function setPreference(userId: string, column: string, value: boolean) {
  await asUser(userId, (sql) =>
    sql(`update public.notification_preferences set ${column} = $1 where user_id = $2`, [
      value,
      userId,
    ]),
  );
}

async function startConversation(buyerId: string, listingId: string) {
  const { rows } = await asUser(buyerId, (sql) =>
    sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
  );
  return rows[0]!.id;
}

async function send(senderId: string, conversationId: string, body = "Bonjour") {
  await asUser(senderId, (sql) =>
    sql("insert into public.messages (conversation_id, body) values ($1, $2)", [
      conversationId,
      body,
    ]),
  );
}

async function block(blockerId: string, blockedId: string) {
  await asUser(blockerId, (sql) =>
    sql("insert into public.blocks (blocked_id) values ($1)", [blockedId]),
  );
}

function fakeSubscription() {
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${randomBytes(16).toString("hex")}`,
    p256dh: randomBytes(65).toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  };
}

describe("notification de nouveau message", () => {
  it("prévient le destinataire et regroupe les messages non lus", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id);
    const conversationId = await startConversation(buyer.id, listingId);

    await send(buyer.id, conversationId);
    await send(buyer.id, conversationId, "Toujours disponible ?");

    const rows = await notificationsOf(seller.id, "new_message");
    expect(rows).toEqual([
      {
        type: "new_message",
        actor_id: buyer.id,
        listing_id: listingId,
        conversation_id: conversationId,
        is_read: false,
      },
    ]);
    expect(await notificationsOf(buyer.id, "new_message")).toHaveLength(0);
  });

  it("est marquée comme lue quand la conversation est lue", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const conversationId = await startConversation(buyer.id, await createActiveListing(seller.id));
    await send(buyer.id, conversationId);

    await asUser(seller.id, (sql) =>
      sql("select public.mark_conversation_read($1)", [conversationId]),
    );
    expect((await notificationsOf(seller.id, "new_message"))[0]?.is_read).toBe(true);

    // Un nouveau message après lecture crée une nouvelle notification.
    await send(buyer.id, conversationId, "Je peux passer demain ?");
    const rows = await notificationsOf(seller.id, "new_message");
    expect(rows.map((row) => row.is_read)).toEqual([true, false]);
  });

  it("respecte la préférence du destinataire", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const conversationId = await startConversation(buyer.id, await createActiveListing(seller.id));
    await setPreference(seller.id, "new_message", false);
    await send(buyer.id, conversationId);
    expect(await notificationsOf(seller.id)).toHaveLength(0);
  });
});

describe("notification de nouvel abonné", () => {
  it("prévient le profil suivi, une fois par jour et par abonné", async () => {
    const author = await createUser();
    const fan = await createUser();
    const follow = (sql: Parameters<Parameters<typeof asUser>[1]>[0]) =>
      sql("insert into public.follows (following_id) values ($1)", [author.id]);
    await asUser(fan.id, follow);
    await asUser(fan.id, (sql) =>
      sql("delete from public.follows where following_id = $1", [author.id]),
    );
    await asUser(fan.id, follow);

    const rows = await notificationsOf(author.id, "new_follower");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actor_id).toBe(fan.id);
  });

  it("respecte la préférence du destinataire", async () => {
    const author = await createUser();
    const fan = await createUser();
    await setPreference(author.id, "new_follower", false);
    await asUser(fan.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [author.id]),
    );
    expect(await notificationsOf(author.id)).toHaveLength(0);
  });
});

describe("notification d'annonce mise en favori", () => {
  it("prévient le vendeur sans doublon", async () => {
    const seller = await createUser();
    const fan = await createUser();
    const listingId = await createActiveListing(seller.id);
    const toggle = async () => {
      await asUser(fan.id, (sql) =>
        sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
      );
      await asUser(fan.id, (sql) =>
        sql("delete from public.favorites where listing_id = $1", [listingId]),
      );
    };
    await toggle();
    await toggle();
    const rows = await notificationsOf(seller.id, "listing_favorited");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: fan.id, listing_id: listingId });
  });

  it("respecte la préférence « activité de mes annonces »", async () => {
    const seller = await createUser();
    const fan = await createUser();
    const listingId = await createActiveListing(seller.id);
    await setPreference(seller.id, "listing_activity", false);
    await asUser(fan.id, (sql) =>
      sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
    );
    expect(await notificationsOf(seller.id)).toHaveLength(0);
  });
});

describe("notification de nouvelle annonce d'un profil suivi", () => {
  it("n'est envoyée qu'aux abonnés qui l'ont activée, à la première publication", async () => {
    const seller = await createUser();
    const optedIn = await createUser();
    const optedOut = await createUser();
    for (const follower of [optedIn, optedOut]) {
      await asUser(follower.id, (sql) =>
        sql("insert into public.follows (following_id) values ($1)", [seller.id]),
      );
    }
    await setPreference(optedIn.id, "followed_user_listing", true);

    const listingId = await createActiveListing(seller.id);
    expect(await notificationsOf(optedIn.id, "followed_user_listing")).toEqual([
      expect.objectContaining({ actor_id: seller.id, listing_id: listingId }),
    ]);
    expect(await notificationsOf(optedOut.id, "followed_user_listing")).toHaveLength(0);

    // Retirer puis remettre en vente ne renvoie pas de notification.
    for (const status of ["withdrawn", "active"]) {
      await asUser(seller.id, (sql) =>
        sql("update public.listings set status = $1 where id = $2", [status, listingId]),
      );
    }
    expect(await notificationsOf(optedIn.id, "followed_user_listing")).toHaveLength(1);
  });

  it("n'est pas envoyée pour un brouillon", async () => {
    const seller = await createUser();
    const follower = await createUser();
    await asUser(follower.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [seller.id]),
    );
    await setPreference(follower.id, "followed_user_listing", true);
    const draftId = await createDraft(seller.id);
    await addImage(seller.id, draftId);
    expect(await notificationsOf(follower.id)).toHaveLength(0);
  });
});

describe("notification de retrait par la modération", () => {
  it("prévient toujours le vendeur", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await setPreference(seller.id, "listing_activity", false);
    await asOwner((sql) =>
      sql(
        "update public.listings set status = 'withdrawn', removed_at = now(), removed_reason = 'Contrefaçon' where id = $1",
        [listingId],
      ),
    );
    expect(await notificationsOf(seller.id, "listing_removed")).toEqual([
      expect.objectContaining({ listing_id: listingId, actor_id: null }),
    ]);
  });
});

describe("blocages", () => {
  it("aucune notification entre utilisateurs bloqués", async () => {
    const seller = await createUser();
    const blocked = await createUser();
    const listingId = await createActiveListing(seller.id);
    const conversationId = await startConversation(blocked.id, listingId);
    await block(seller.id, blocked.id);

    await expectDenied(send(blocked.id, conversationId));
    await asUser(blocked.id, (sql) =>
      sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
    );
    expect(await notificationsOf(seller.id)).toHaveLength(0);
  });
});

describe("register_push_subscription", () => {
  it("enregistre l'abonnement et active le push", async () => {
    const user = await createUser();
    const sub = fakeSubscription();
    await asUser(user.id, (sql) =>
      sql("select public.register_push_subscription($1, $2, $3, $4)", [
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        "Mozilla/5.0",
      ]),
    );
    const { rows } = await asUser(user.id, (sql) =>
      sql<{ endpoint: string; push_enabled: boolean }>(
        `select s.endpoint, p.push_enabled
         from public.push_subscriptions s
         join public.notification_preferences p on p.user_id = s.user_id`,
      ),
    );
    expect(rows).toEqual([{ endpoint: sub.endpoint, push_enabled: true }]);
  });

  it("transfère un navigateur partagé au dernier compte connecté", async () => {
    const first = await createUser();
    const second = await createUser();
    const sub = fakeSubscription();
    const register = (userId: string) =>
      asUser(userId, (sql) =>
        sql("select public.register_push_subscription($1, $2, $3)", [
          sub.endpoint,
          sub.p256dh,
          sub.auth,
        ]),
      );
    await register(first.id);
    await register(second.id);
    const { rows } = await asOwner((sql) =>
      sql<{ user_id: string }>(
        "select user_id from public.push_subscriptions where endpoint = $1",
        [sub.endpoint],
      ),
    );
    expect(rows).toEqual([{ user_id: second.id }]);
  });

  it("conserve au plus 10 navigateurs par compte", async () => {
    const user = await createUser();
    for (let i = 0; i < 12; i += 1) {
      const sub = fakeSubscription();
      await asUser(user.id, (sql) =>
        sql("select public.register_push_subscription($1, $2, $3)", [
          sub.endpoint,
          sub.p256dh,
          sub.auth,
        ]),
      );
    }
    const { rows } = await asOwner((sql) =>
      sql<{ count: string }>("select count(*) from public.push_subscriptions where user_id = $1", [
        user.id,
      ]),
    );
    expect(Number(rows[0]!.count)).toBe(10);
  });

  it("refuse un service inconnu, un compte suspendu et l'accès anonyme", async () => {
    const user = await createUser();
    const sub = fakeSubscription();
    // Le serveur ne doit contacter que les services push des navigateurs.
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/x",
      "https://10.0.0.5:8443/x",
      "https://evil.example/fcm.googleapis.com/",
      "https://fcm.googleapis.com.evil.example/x",
    ]) {
      await expectError(
        asUser(user.id, (sql) =>
          sql("select public.register_push_subscription($1, $2, $3)", [
            endpoint,
            sub.p256dh,
            sub.auth,
          ]),
        ),
        "23514",
      );
    }
    for (const endpoint of [
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/QGuQyavXutnMH",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      await asUser(user.id, (sql) =>
        sql("select public.register_push_subscription($1, $2, $3)", [
          endpoint,
          sub.p256dh,
          sub.auth,
        ]),
      );
    }
    await expectDenied(
      asAnon((sql) =>
        sql("select public.register_push_subscription($1, $2, $3)", [
          sub.endpoint,
          sub.p256dh,
          sub.auth,
        ]),
      ),
    );
    await suspendUser(user.id);
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("select public.register_push_subscription($1, $2, $3)", [
          sub.endpoint,
          sub.p256dh,
          sub.auth,
        ]),
      ),
    );
  });
});
