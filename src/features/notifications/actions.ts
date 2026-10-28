"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { routes } from "@/config/routes";
import { signInHref } from "@/features/auth/links";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, formText } from "@/lib/forms/form-state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notificationHref } from "./content";
import { getPushConfig, sendPush } from "./push/send";
import { isAllowedPushEndpoint } from "./push-endpoint";
import { getT } from "@/i18n/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) redirect(signInHref(routes.notifications));
  await supabase.rpc("mark_all_notifications_read");
  revalidatePath(routes.notifications);
}

/** Marque la notification comme lue puis ouvre la page concernée. */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const id = formText(formData, "notificationId");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) redirect(signInHref(routes.notifications));
  if (!UUID.test(id)) redirect(routes.notifications);

  // La destination est recalculée à partir de la base (RLS : destinataire
  // uniquement), jamais à partir d'une URL fournie par le navigateur.
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, is_read, listing_id, conversation_id, note, actor_id, support_request_id, actor:profiles!notifications_actor_id_fkey(username)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) redirect(routes.notifications);

  if (!data.is_read) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", data.id);
  }
  redirect(
    notificationHref({
      type: data.type,
      actorId: data.actor_id,
      actorUsername: data.actor?.username ?? null,
      listingId: data.listing_id,
      conversationId: data.conversation_id,
      note: data.note,
      supportRequestId: data.support_request_id,
    }),
  );
}

// -----------------------------------------------------------------------------
// Préférences
// -----------------------------------------------------------------------------
const preferenceFields = [
  "new_message",
  "new_follower",
  "followed_user_listing",
  "listing_activity",
] as const;

export type PreferenceField = (typeof preferenceFields)[number];

export async function updateNotificationPreferencesAction(
  _previous: FormState<PreferenceField>,
  formData: FormData,
): Promise<FormState<PreferenceField>> {
  const texts = (await getT()).notificationActions;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired };

  const update = Object.fromEntries(
    preferenceFields.map((field) => [field, formData.get(field) === "on"]),
  ) as Record<PreferenceField, boolean>;

  const { error } = await supabase
    .from("notification_preferences")
    .update(update)
    .eq("user_id", user.id);
  if (error) return { status: "error", message: texts.generic };
  revalidatePath(routes.settingsNotifications);
  return { status: "success", message: texts.preferencesSaved };
}

// -----------------------------------------------------------------------------
// Abonnements Web Push
// -----------------------------------------------------------------------------
const base64url = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/);

const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isAllowedPushEndpoint),
  keys: z.object({ p256dh: base64url(200), auth: base64url(100) }),
});

export type PushResult = { status: "ok" } | { status: "error"; message: string };

/** Enregistre l'abonnement push du navigateur pour l'utilisateur connecté. */
export async function savePushSubscriptionAction(input: unknown): Promise<PushResult> {
  const texts = (await getT()).notificationActions;
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: texts.invalidSubscription };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired };

  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? undefined;
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: userAgent,
  });
  if (error) {
    return { status: "error", message: texts.enableFailed };
  }
  revalidatePath(routes.settingsNotifications);
  return { status: "ok" };
}

/**
 * Retire l'abonnement push de cet appareil. Sans autre appareil abonné, le
 * push est désactivé pour le compte.
 */
export async function removePushSubscriptionAction(endpoint: string): Promise<PushResult> {
  const texts = (await getT()).notificationActions;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired };
  if (typeof endpoint !== "string" || endpoint.length > 1000) {
    return { status: "error", message: texts.generic };
  }

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!count) {
    await supabase
      .from("notification_preferences")
      .update({ push_enabled: false })
      .eq("user_id", user.id);
  }
  revalidatePath(routes.settingsNotifications);
  return { status: "ok" };
}

const lastTestByUser = new Map<string, number>();
const TEST_INTERVAL_MS = 30_000;

/** Envoie une notification de test à tous les appareils de l'utilisateur. */
export async function sendTestPushAction(): Promise<PushResult & { sent?: number }> {
  const texts = (await getT()).notificationActions;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired };

  // Même chemin que les vraies notifications : clés VAPID et clé service_role.
  const config = getPushConfig();
  if (!config || !createSupabaseAdminClient()) {
    return { status: "error", message: texts.serverNotConfigured };
  }

  const now = Date.now();
  if (now - (lastTestByUser.get(user.id) ?? 0) < TEST_INTERVAL_MS) {
    return { status: "error", message: texts.waitBeforeRetry };
  }
  lastTestByUser.set(user.id, now);

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);
  if (!subscriptions?.length) {
    return { status: "error", message: texts.noDevice };
  }

  const result = await sendPush(
    subscriptions,
    {
      title: texts.testTitle,
      body: texts.testBody,
      url: routes.notifications,
      tag: "test",
    },
    config,
  );
  if (result.expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", result.expired);
  }
  if (result.sent.length === 0) {
    return {
      status: "error",
      message: result.expired.length > 0 ? texts.deviceExpired : texts.serviceRefused,
    };
  }
  return { status: "ok", sent: result.sent.length };
}
