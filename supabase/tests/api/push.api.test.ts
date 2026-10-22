import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toggleFavoriteAction } from "@/features/favorites/actions";
import { finalizeListingAction, saveListingAction } from "@/features/listings/actions";
import {
  markConversationReadAction,
  sendMessageAction,
  startConversationAction,
} from "@/features/messaging/actions";
import { toggleFollowAction } from "@/features/profiles/actions";
import { asOwner, asUser, createActiveListing, createUser, suspendUser } from "../support/db";
import { actAs } from "./support/context";
import { flushAfter, RedirectError } from "./support/setup";

const { sendNotification } = vi.hoisted(() => ({
  sendNotification: vi.fn<(...args: unknown[]) => Promise<{ statusCode: number }>>(async () => ({
    statusCode: 201,
  })),
}));

vi.mock("web-push", () => {
  class WebPushError extends Error {
    constructor(public statusCode: number) {
      super("push_error");
    }
  }
  return { default: { sendNotification }, WebPushError };
});
vi.mock("@/features/notifications/push/send", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/notifications/push/send")>()),
  getPushConfig: () => ({ publicKey: "pub", privateKey: "priv", subject: "mailto:a@b.cm" }),
}));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Enregistre un appareil (comme le bouton « Activer » des paramètres). */
async function registerDevice(userId: string) {
  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  await asUser(userId, (sql) =>
    sql("select public.register_push_subscription($1, 'cle-publique', 'secret')", [endpoint]),
  );
  return endpoint;
}

type SentPayload = { title: string; body: string; url: string; tag: string };

/** Résultat d'envoi enregistré sur la dernière notification du destinataire. */
async function lastPushStatus(userId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ push_status: string | null; push_detail: string | null }>(
      `select push_status, push_detail from public.notifications
       where user_id = $1 order by created_at desc limit 1`,
      [userId],
    ),
  );
  return rows[0];
}

function pushesTo(endpoint: string): SentPayload[] {
  return sendNotification.mock.calls
    .filter(([target]) => (target as { endpoint: string }).endpoint === endpoint)
    .map(([, body]) => JSON.parse(body as string) as SentPayload);
}

async function openConversation(buyerId: string, listingId: string) {
  actAs({ id: buyerId });
  const error = await startConversationAction({}, form({ listingId })).catch((caught) => caught);
  if (!(error instanceof RedirectError)) throw error;
  return error.url.split("/").pop()!;
}

beforeEach(() => {
  actAs(null);
  sendNotification.mockClear();
});

describe("notifications push envoyées par l'application", () => {
  it("prévient le vendeur à chaque nouveau message, sans doublon", async () => {
    const seller = await createUser({ display_name: "Vendeuse" });
    const buyer = await createUser();
    const endpoint = await registerDevice(seller.id);
    const listingId = await createActiveListing(seller.id, { title: "Vélo enfant" });
    const conversationId = await openConversation(buyer.id, listingId);

    await sendMessageAction(conversationId, "Bonjour, toujours disponible ?");
    await flushAfter();
    await sendMessageAction(conversationId, "Je peux passer ce soir.");
    await flushAfter();

    const pushes = pushesTo(endpoint);
    expect(pushes).toHaveLength(2);
    expect(pushes[0]).toMatchObject({
      title: "Nouveau message",
      url: `/messages/${conversationId}`,
      tag: `conversation:${conversationId}`,
    });
    expect(pushes[0]!.body).toContain("Vélo enfant");
    // Le contenu du message privé n'est jamais envoyé au service push.
    expect(JSON.stringify(pushes)).not.toContain("passer ce soir");

    expect(await lastPushStatus(seller.id)).toEqual({ push_status: "sent", push_detail: null });

    // Un second envoi (rejeu) ne renvoie rien.
    await flushAfter();
    expect(pushesTo(endpoint)).toHaveLength(2);

    // Après lecture, un nouveau message est de nouveau notifié.
    actAs(seller);
    await markConversationReadAction(conversationId);
    actAs(buyer);
    await sendMessageAction(conversationId, "Toujours intéressé !");
    await flushAfter();
    expect(pushesTo(endpoint)).toHaveLength(3);
  });

  it("prévient des abonnements, favoris et nouvelles annonces des profils suivis", async () => {
    const seller = await createUser();
    const fan = await createUser();
    const sellerDevice = await registerDevice(seller.id);
    const fanDevice = await registerDevice(fan.id);
    const listingId = await createActiveListing(seller.id, { title: "Lampe vintage" });

    actAs(fan);
    await toggleFollowAction({ following: false }, form({ profileId: seller.id }));
    await toggleFavoriteAction({ favorited: false }, form({ listingId }));
    await flushAfter();
    expect(
      pushesTo(sellerDevice)
        .map((push) => push.title)
        .sort(),
    ).toEqual(["Annonce ajoutée aux favoris", "Nouvel abonné"]);

    // Nouvelle annonce publiée par le vendeur suivi (préférence active par défaut).
    actAs(seller);
    const saved = await saveListingAction(
      null,
      form({
        title: "Chaise en rotin",
        description: "Chaise en rotin solide, quelques traces d'usage.",
        category: "maison",
        condition: "good",
        price: "15000",
        city: "douala",
      }),
    );
    if (saved.status !== "saved") throw new Error("annonce non enregistrée");
    await finalizeListingAction({
      listingId: saved.listingId,
      images: [{ path: `${seller.id}/${saved.listingId}/${randomUUID()}.webp` }],
      publish: true,
    });
    await flushAfter();
    expect(pushesTo(fanDevice)).toEqual([
      expect.objectContaining({ title: "Nouvelle annonce", url: `/annonces/${saved.listingId}` }),
    ]);
  });

  it("n'envoie rien si le push est désactivé ou si l'auteur est suspendu", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const endpoint = await registerDevice(seller.id);
    const listingId = await createActiveListing(seller.id);
    const conversationId = await openConversation(buyer.id, listingId);

    await asUser(seller.id, (sql) =>
      sql("update public.notification_preferences set push_enabled = false where user_id = $1", [
        seller.id,
      ]),
    );
    await sendMessageAction(conversationId, "Bonjour");
    await flushAfter();
    expect(pushesTo(endpoint)).toHaveLength(0);
    expect(await lastPushStatus(seller.id)).toMatchObject({ push_status: "disabled" });

    await asUser(seller.id, (sql) =>
      sql("update public.notification_preferences set push_enabled = true where user_id = $1", [
        seller.id,
      ]),
    );
    await suspendUser(buyer.id);
    actAs(buyer);
    await sendMessageAction(conversationId, "Encore moi");
    await flushAfter();
    expect(pushesTo(endpoint)).toHaveLength(0);
  });

  it("enregistre le refus du service push pour le diagnostic", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    await registerDevice(seller.id);
    const listingId = await createActiveListing(seller.id);
    const conversationId = await openConversation(buyer.id, listingId);

    const { WebPushError } = await import("web-push");
    sendNotification.mockRejectedValueOnce(
      new (WebPushError as unknown as new (statusCode: number) => Error)(403),
    );
    await sendMessageAction(conversationId, "Bonjour");
    await flushAfter();
    expect(await lastPushStatus(seller.id)).toEqual({
      push_status: "failed",
      push_detail: "HTTP 403",
    });
  });
});
