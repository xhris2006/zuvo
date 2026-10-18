import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryBuilder } from "@/test/supabase-mock";

const sendNotification = vi.fn();

vi.mock("web-push", () => {
  class WebPushError extends Error {
    constructor(public statusCode: number) {
      super("push_error");
    }
  }
  return { default: { sendNotification }, WebPushError };
});

const { WebPushError } = (await import("web-push")) as unknown as {
  WebPushError: new (statusCode: number) => Error;
};
const { dispatchNotification } = await import("./dispatch");

const config = { publicKey: "pub", privateKey: "priv", subject: "mailto:contact@example.cm" };
const NOTIFICATION_ID = "4f1c2a3b-0000-4000-8000-0000000000dd";
const CONVERSATION_ID = "4f1c2a3b-0000-4000-8000-0000000000bb";

function adminWith(tables: Record<string, Array<ReturnType<typeof queryBuilder>>>) {
  return {
    from: vi.fn((table: string) => {
      const next = tables[table]?.shift();
      if (!next) throw new Error(`requête inattendue sur ${table}`);
      return next;
    }),
  };
}

const notification = {
  id: NOTIFICATION_ID,
  user_id: "u1",
  type: "new_message",
  is_read: false,
  listing_id: "l1",
  conversation_id: CONVERSATION_ID,
  actor: { username: "awa", display_name: "Awa" },
  listing: { title: "Robe en wax" },
};

const subscriptions = [
  { id: "s1", endpoint: "https://fcm.googleapis.com/fcm/send/1", p256dh: "k1", auth: "a1" },
  { id: "s2", endpoint: "https://fcm.googleapis.com/fcm/send/2", p256dh: "k2", auth: "a2" },
];

beforeEach(() => {
  sendNotification.mockReset();
});

describe("dispatchNotification", () => {
  it("ignore une notification introuvable ou déjà lue", async () => {
    const missing = adminWith({ notifications: [queryBuilder({ data: null })] });
    expect(await dispatchNotification(missing as never, NOTIFICATION_ID, config)).toEqual({
      status: "skipped",
      reason: "not_found",
    });
    const read = adminWith({
      notifications: [queryBuilder({ data: { ...notification, is_read: true } })],
    });
    expect(await dispatchNotification(read as never, NOTIFICATION_ID, config)).toMatchObject({
      reason: "already_read",
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("n'envoie rien au nom d'un compte suspendu", async () => {
    const admin = adminWith({
      notifications: [
        queryBuilder({
          data: {
            ...notification,
            actor: { ...notification.actor, suspended_at: "2026-10-18T10:00:00Z" },
          },
        }),
      ],
    });
    expect(await dispatchNotification(admin as never, NOTIFICATION_ID, config)).toMatchObject({
      reason: "actor_suspended",
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("ne contacte jamais un hôte hors des services push connus", async () => {
    const remove = queryBuilder();
    const admin = adminWith({
      notifications: [queryBuilder({ data: notification })],
      notification_preferences: [queryBuilder({ data: { push_enabled: true } })],
      push_subscriptions: [
        queryBuilder({
          data: [{ id: "s9", endpoint: "https://10.0.0.5/interne", p256dh: "k", auth: "a" }],
        }),
        remove,
      ],
    });
    expect(await dispatchNotification(admin as never, NOTIFICATION_ID, config)).toEqual({
      status: "done",
      sent: 0,
      expired: 1,
      failed: 0,
    });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(remove.in).toHaveBeenCalledWith("id", ["s9"]);
  });

  it("n'envoie rien si le push est désactivé", async () => {
    const admin = adminWith({
      notifications: [queryBuilder({ data: notification })],
      notification_preferences: [queryBuilder({ data: { push_enabled: false } })],
      push_subscriptions: [queryBuilder({ data: subscriptions })],
    });
    expect(await dispatchNotification(admin as never, NOTIFICATION_ID, config)).toMatchObject({
      reason: "push_disabled",
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("envoie à chaque appareil et supprime les abonnements expirés", async () => {
    sendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce(new WebPushError(410));
    const remove = queryBuilder();
    const touch = queryBuilder();
    const admin = adminWith({
      notifications: [queryBuilder({ data: notification })],
      notification_preferences: [queryBuilder({ data: { push_enabled: true } })],
      push_subscriptions: [queryBuilder({ data: subscriptions }), remove, touch],
    });

    const outcome = await dispatchNotification(admin as never, NOTIFICATION_ID, config);
    expect(outcome).toEqual({ status: "done", sent: 1, expired: 1, failed: 0 });

    const [target, body, options] = sendNotification.mock.calls[0]!;
    expect(target).toEqual({
      endpoint: subscriptions[0]!.endpoint,
      keys: { p256dh: "k1", auth: "a1" },
    });
    expect(JSON.parse(body as string)).toEqual({
      title: "Nouveau message",
      body: "Awa vous a écrit à propos de «\u00a0Robe en wax\u00a0».",
      url: `/messages/${CONVERSATION_ID}`,
      tag: `conversation:${CONVERSATION_ID}`,
    });
    expect(options).toMatchObject({ vapidDetails: config, urgency: "normal" });
    expect(remove.in).toHaveBeenCalledWith("id", ["s2"]);
    expect(touch.in).toHaveBeenCalledWith("id", ["s1"]);
  });

  it("compte les échecs sans supprimer l'abonnement", async () => {
    sendNotification.mockRejectedValue(new WebPushError(500));
    const admin = adminWith({
      notifications: [queryBuilder({ data: { ...notification, conversation_id: null } })],
      notification_preferences: [queryBuilder({ data: { push_enabled: true } })],
      push_subscriptions: [queryBuilder({ data: [subscriptions[0]] })],
    });
    expect(await dispatchNotification(admin as never, NOTIFICATION_ID, config)).toEqual({
      status: "done",
      sent: 0,
      expired: 0,
      failed: 1,
    });
  });
});
