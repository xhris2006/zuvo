import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { toggleFavoriteAction } from "@/features/favorites/actions";
import {
  deleteListingAction,
  finalizeListingAction,
  saveListingAction,
  updateListingStatusAction,
} from "@/features/listings/actions";
import { getListingDetail } from "@/features/listings/queries";
import {
  loadOlderMessagesAction,
  markConversationReadAction,
  sendMessageAction,
  startConversationAction,
} from "@/features/messaging/actions";
import {
  getConversation,
  getConversations,
  getMessages,
  getUnreadMessagesCount,
} from "@/features/messaging/queries";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions";
import {
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationsCount,
} from "@/features/notifications/queries";
import {
  toggleFollowAction,
  updatePrivateContactAction,
  updateProfileAction,
} from "@/features/profiles/actions";
import {
  getFollowList,
  getOwnPrivateContact,
  getProfileByUsername,
  getProfileStats,
  isFollowing,
} from "@/features/profiles/queries";
import { createActiveListing, createUser } from "../support/db";
import { actAs } from "./support/context";
import { RedirectError } from "./support/setup";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function redirectOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (!(error instanceof RedirectError)) throw error ?? new Error("redirection attendue");
  return error.url;
}

beforeEach(() => actAs(null));

describe("vendre une annonce (actions réelles)", () => {
  it("crée, publie, change de statut puis supprime une annonce", async () => {
    const seller = await createUser();
    actAs(seller);

    const saved = await saveListingAction(
      null,
      form({
        title: "Baskets Nike Air taille 42",
        description: "Portées trois fois, très bon état, boîte d'origine.",
        category: "chaussures",
        condition: "very_good",
        price: "25 000",
        city: "douala",
      }),
    );
    expect(saved).toMatchObject({ status: "saved" });
    if (saved.status !== "saved") return;

    const path = `${seller.id}/${saved.listingId}/${randomUUID()}.webp`;
    const published = await finalizeListingAction({
      listingId: saved.listingId,
      images: [{ path }],
      publish: true,
    });
    expect(published).toEqual({ status: "ok", listingId: saved.listingId });

    actAs(null);
    const visible = await getListingDetail(saved.listingId);
    expect(visible).toMatchObject({ status: "active", price: 25000 });
    expect(visible?.images).toHaveLength(1);

    actAs(seller);
    expect(
      await updateListingStatusAction({}, form({ listingId: saved.listingId, status: "reserved" })),
    ).toEqual({});
    expect(await redirectOf(deleteListingAction({}, form({ listingId: saved.listingId })))).toMatch(
      /^\/profil/,
    );
    actAs(null);
    expect(await getListingDetail(saved.listingId)).toBeNull();
  });
});

describe("messagerie (actions réelles)", () => {
  it("ouvre une conversation, échange, compte et marque les messages lus", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id, { title: "Montre Casio" });

    actAs(buyer);
    const url = await redirectOf(startConversationAction({}, form({ listingId })));
    const conversationId = url.split("/").pop()!;
    expect(url).toBe(`/messages/${conversationId}`);
    const sent = await sendMessageAction(conversationId, "Bonjour, toujours disponible ?");
    expect(sent).toMatchObject({ status: "sent", message: { sender_id: buyer.id } });

    actAs(seller);
    const inbox = await getConversations();
    expect(inbox.find((item) => item.conversation_id === conversationId)).toMatchObject({
      listing_title: "Montre Casio",
      other_username: buyer.username,
      unread_count: 1,
      is_buyer: false,
    });
    expect(await getUnreadMessagesCount()).toBe(1);

    const conversation = await getConversation(conversationId);
    expect(conversation).toMatchObject({
      listing: { id: listingId, title: "Montre Casio" },
      buyer: { id: buyer.id },
      seller: { id: seller.id },
    });
    expect(await getMessages(conversationId)).toHaveLength(1);

    await markConversationReadAction(conversationId);
    expect(await getUnreadMessagesCount()).toBe(0);
    expect(await loadOlderMessagesAction(conversationId, new Date().toISOString())).toHaveLength(1);

    // La notification de message n'apparaît pas dans la liste, mais existe pour le push.
    const notifications = await getNotifications();
    expect(notifications.items.map((item) => item.type)).not.toContain("new_message");
  });
});

describe("social et notifications (actions réelles)", () => {
  it("abonnement, favori, notifications, préférences et push", async () => {
    const seller = await createUser();
    const fan = await createUser();
    const listingId = await createActiveListing(seller.id, { title: "Robe en wax rouge" });

    actAs(fan);
    expect(
      await toggleFollowAction(
        { following: false },
        form({ profileId: seller.id, username: seller.username }),
      ),
    ).toEqual({ following: true });
    expect(await isFollowing(fan.id, seller.id)).toBe(true);
    expect(await toggleFavoriteAction({ favorited: false }, form({ listingId }))).toEqual({
      favorited: true,
    });

    actAs(seller);
    expect(await getUnreadNotificationsCount()).toBe(2);
    const { items } = await getNotifications();
    expect(items.map((item) => item.type).sort()).toEqual(["listing_favorited", "new_follower"]);
    const favorited = items.find((item) => item.type === "listing_favorited")!;
    expect(favorited).toMatchObject({
      actorUsername: fan.username,
      listingTitle: "Robe en wax rouge",
    });

    expect(await redirectOf(openNotificationAction(form({ notificationId: favorited.id })))).toBe(
      `/annonces/${listingId}`,
    );
    expect(await getUnreadNotificationsCount()).toBe(1);
    await markAllNotificationsReadAction();
    expect(await getUnreadNotificationsCount()).toBe(0);

    const preferences = await updateNotificationPreferencesAction(
      { status: "idle" },
      form({ new_message: "on", listing_activity: "on" }),
    );
    expect(preferences.status).toBe("success");
    expect(await getNotificationPreferences()).toMatchObject({
      new_message: true,
      new_follower: false,
      listing_activity: true,
    });

    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    const subscription = {
      endpoint,
      keys: {
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u",
        auth: "tBHItJI5svbpez7KI4CCXg",
      },
    };
    expect(await savePushSubscriptionAction(subscription)).toEqual({ status: "ok" });
    expect((await getNotificationPreferences()).push_enabled).toBe(true);
    expect(await removePushSubscriptionAction(endpoint)).toEqual({ status: "ok" });
    expect((await getNotificationPreferences()).push_enabled).toBe(false);
  });
});

describe("profils (actions réelles)", () => {
  it("modifie le profil et le téléphone privé, calcule les compteurs", async () => {
    const owner = await createUser();
    const follower = await createUser();
    await createActiveListing(owner.id);

    actAs(follower);
    await toggleFollowAction({ following: false }, form({ profileId: owner.id }));

    actAs(owner);
    const username = `awa_${randomUUID().slice(0, 8)}`;
    const updated = await updateProfileAction(
      { status: "idle" },
      form({
        username,
        displayName: "Awa Ndiaye",
        bio: "Vide-dressing à Douala.",
        city: "douala",
        avatarPath: "",
      }),
    );
    expect(updated.status).toBe("success");
    const contact = await updatePrivateContactAction(
      { status: "idle" },
      form({ phone: "6 90 00 00 00" }),
    );
    expect(contact.status).toBe("success");
    expect(await getOwnPrivateContact(owner.id)).toEqual({ phone: "+237690000000" });

    actAs(null);
    expect(await getProfileByUsername(username)).toMatchObject({ display_name: "Awa Ndiaye" });
    expect(await getProfileStats(owner.id)).toEqual({
      followers: 1,
      following: 0,
      activeListings: 1,
    });
    const followers = await getFollowList(owner.id, "followers");
    expect(followers.items.map((item) => item.id)).toEqual([follower.id]);
    const following = await getFollowList(follower.id, "following");
    expect(following.items.map((item) => item.username)).toEqual([username]);
  });
});
