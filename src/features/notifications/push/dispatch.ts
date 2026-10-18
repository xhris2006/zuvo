import "server-only";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { describeNotification, type NotificationSubject, notificationHref } from "../content";
import { type PushConfig, sendPush } from "./send";

export type DispatchOutcome =
  | { status: "skipped"; reason: "not_found" | "already_read" | "push_disabled" | "no_device" }
  | { status: "done"; sent: number; expired: number; failed: number };

/**
 * Envoie une notification interne sous forme de notification push à tous les
 * appareils de son destinataire. Le contenu est relu en base (client
 * service_role) : seul l'identifiant fourni par le webhook est utilisé.
 */
export async function dispatchNotification(
  admin: TypedSupabaseClient,
  notificationId: string,
  config: PushConfig,
): Promise<DispatchOutcome> {
  const { data: notification, error } = await admin
    .from("notifications")
    .select(
      `id, user_id, type, is_read, listing_id, conversation_id,
       actor:profiles!notifications_actor_id_fkey(username, display_name),
       listing:listings(title)`,
    )
    .eq("id", notificationId)
    .maybeSingle();
  if (error) throw new Error("push_dispatch_query_failed");
  if (!notification) return { status: "skipped", reason: "not_found" };
  if (notification.is_read) return { status: "skipped", reason: "already_read" };

  const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
    admin
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", notification.user_id)
      .maybeSingle(),
    admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", notification.user_id),
  ]);
  if (!preferences?.push_enabled) return { status: "skipped", reason: "push_disabled" };
  if (!subscriptions?.length) return { status: "skipped", reason: "no_device" };

  const subject: NotificationSubject = {
    type: notification.type,
    actorName: notification.actor?.display_name ?? null,
    actorUsername: notification.actor?.username ?? null,
    listingId: notification.listing_id,
    listingTitle: notification.listing?.title ?? null,
    conversationId: notification.conversation_id,
  };
  const result = await sendPush(
    subscriptions,
    {
      ...describeNotification(subject),
      url: notificationHref(subject),
      tag: notification.conversation_id
        ? `conversation:${notification.conversation_id}`
        : `notification:${notification.id}`,
    },
    config,
  );

  if (result.expired.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", result.expired);
  }
  if (result.sent.length > 0) {
    await admin
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", result.sent);
  }
  return {
    status: "done",
    sent: result.sent.length,
    expired: result.expired.length,
    failed: result.failed,
  };
}
