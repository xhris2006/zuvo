import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  expectRedirect,
  formData,
  queryBuilder,
  RedirectError,
  type SupabaseMock,
} from "@/test/supabase-mock";

const NOTIFICATION_ID = "4f1c2a3b-0000-4000-8000-0000000000dd";
const LISTING_ID = "4f1c2a3b-0000-4000-8000-0000000000aa";

let supabase: SupabaseMock | null;
let currentUser: { id: string; email: string } | null;

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "user-agent": "Mozilla/5.0 (Android)" })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));
vi.mock("./push/send", () => ({ getPushConfig: () => null, sendPush: vi.fn() }));

const {
  markAllNotificationsReadAction,
  openNotificationAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
  updateNotificationPreferencesAction,
} = await import("./actions");

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  expirationTime: null,
  keys: {
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: "u1", email: "a@b.cm" };
});

describe("openNotificationAction", () => {
  it("exige une session", async () => {
    currentUser = null;
    await expectRedirect(
      openNotificationAction(formData({ notificationId: NOTIFICATION_ID })),
      "/connexion?next=%2Fnotifications",
    );
  });

  it("ignore un identifiant invalide ou inconnu", async () => {
    await expectRedirect(
      openNotificationAction(formData({ notificationId: "x" })),
      "/notifications",
    );
    supabase!.from.mockReturnValueOnce(queryBuilder({ data: null }));
    await expectRedirect(
      openNotificationAction(formData({ notificationId: NOTIFICATION_ID })),
      "/notifications",
    );
  });

  it("marque comme lue et ouvre la cible calculée en base", async () => {
    supabase!.from.mockReturnValueOnce(
      queryBuilder({
        data: {
          id: NOTIFICATION_ID,
          type: "listing_favorited",
          is_read: false,
          listing_id: LISTING_ID,
          conversation_id: null,
          actor: { username: "awa" },
        },
      }),
    );
    const update = queryBuilder();
    supabase!.from.mockReturnValueOnce(update);
    await expectRedirect(
      openNotificationAction(formData({ notificationId: NOTIFICATION_ID })),
      `/annonces/${LISTING_ID}`,
    );
    expect(update.update).toHaveBeenCalledWith({ is_read: true });
    expect(update.eq).toHaveBeenCalledWith("id", NOTIFICATION_ID);
  });
});

describe("markAllNotificationsReadAction", () => {
  it("appelle la fonction de la base", async () => {
    await markAllNotificationsReadAction();
    expect(supabase!.rpc).toHaveBeenCalledWith("mark_all_notifications_read");
  });
});

describe("updateNotificationPreferencesAction", () => {
  it("enregistre les cases cochées et décochées", async () => {
    const update = queryBuilder();
    supabase!.from.mockReturnValueOnce(update);
    const state = await updateNotificationPreferencesAction(
      { status: "idle" },
      formData({ new_message: "on", followed_user_listing: "on", push_enabled: "on" }),
    );
    expect(state.status).toBe("success");
    // push_enabled n'est pas modifiable par ce formulaire.
    expect(update.update).toHaveBeenCalledWith({
      new_message: true,
      new_follower: false,
      followed_user_listing: true,
      listing_activity: false,
    });
    expect(update.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("signale une session expirée", async () => {
    currentUser = null;
    const state = await updateNotificationPreferencesAction({ status: "idle" }, formData({}));
    expect(state).toMatchObject({ status: "error" });
  });
});

describe("abonnements push", () => {
  it("enregistre un abonnement valide avec l'agent utilisateur du serveur", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await savePushSubscriptionAction(subscription)).toEqual({ status: "ok" });
    expect(supabase!.rpc).toHaveBeenCalledWith("register_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: subscription.keys.p256dh,
      p_auth: subscription.keys.auth,
      p_user_agent: "Mozilla/5.0 (Android)",
    });
  });

  it("refuse un abonnement malformé ou non HTTPS", async () => {
    for (const input of [
      null,
      { ...subscription, endpoint: "http://push.example.test/x" },
      { ...subscription, endpoint: "javascript:alert(1)" },
      { ...subscription, endpoint: "https://10.0.0.5:8443/interne" },
      { ...subscription, keys: { p256dh: "<script>", auth: "x" } },
    ]) {
      expect(await savePushSubscriptionAction(input)).toMatchObject({ status: "error" });
    }
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it("désactive le push quand le dernier appareil est retiré", async () => {
    const remove = queryBuilder();
    const update = queryBuilder();
    supabase!.from
      .mockReturnValueOnce(remove)
      .mockReturnValueOnce(queryBuilder({ count: 0 }))
      .mockReturnValueOnce(update);
    expect(await removePushSubscriptionAction(subscription.endpoint)).toEqual({ status: "ok" });
    expect(remove.eq).toHaveBeenCalledWith("endpoint", subscription.endpoint);
    expect(update.update).toHaveBeenCalledWith({ push_enabled: false });
  });

  it("n'envoie pas de test tant que le push n'est pas configuré", async () => {
    expect(await sendTestPushAction()).toMatchObject({
      status: "error",
      message: expect.stringMatching(/pas encore configuré/),
    });
  });
});
