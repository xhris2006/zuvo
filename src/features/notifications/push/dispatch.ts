import "server-only";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  describeNotification,
  type NotificationSubject,
  type NotificationType,
  notificationHref,
} from "../content";
import { type PushConfig, type StoredSubscription, sendPush } from "./send";

/** Notifications à envoyer : créées par une action précise, il y a peu. */
export type PushFilter = {
  type: NotificationType;
  /** Auteur de l'action (absent pour la modération). */
  actorId?: string;
  listingId?: string;
  conversationId?: string;
};

export type DispatchSummary = {
  notifications: number;
  sent: number;
  expired: number;
  failed: number;
  skipped: number;
};

/** Au-delà, une notification n'est plus envoyée en push (évite les rattrapages tardifs). */
const MAX_AGE_MS = 10 * 60 * 1000;

const CLAIM_COLUMNS = `id, user_id, type, is_read, listing_id, conversation_id,
  actor:profiles!notifications_actor_id_fkey(username, display_name, suspended_at),
  listing:listings(title)`;

/**
 * Réserve puis envoie les notifications push correspondant au filtre. La
 * réservation (pushed_at) est atomique : une notification n'est jamais
 * envoyée deux fois, même si deux envois se chevauchent. Toutes les données
 * sont relues en base avec le client service_role.
 */
export async function dispatchPendingPush(
  admin: TypedSupabaseClient,
  filter: PushFilter,
  config: PushConfig,
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { notifications: 0, sent: 0, expired: 0, failed: 0, skipped: 0 };

  let claim = admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .is("pushed_at", null)
    .eq("type", filter.type)
    .gte("created_at", new Date(Date.now() - MAX_AGE_MS).toISOString());
  if (filter.actorId) claim = claim.eq("actor_id", filter.actorId);
  if (filter.listingId) claim = claim.eq("listing_id", filter.listingId);
  if (filter.conversationId) claim = claim.eq("conversation_id", filter.conversationId);

  const { data: notifications, error } = await claim.select(CLAIM_COLUMNS);
  if (error) throw new Error("push_claim_failed");
  const outcomes = new Map<string, { status: PushStatus; detail?: string }>();
  // Lecture en service_role : RLS ne masque pas les comptes suspendus.
  const deliverable = (notifications ?? []).filter((notification) => {
    const keep = !notification.is_read && !notification.actor?.suspended_at;
    if (!keep) outcomes.set(notification.id, { status: "skipped" });
    return keep;
  });
  summary.notifications = notifications?.length ?? 0;
  summary.skipped = summary.notifications - deliverable.length;

  if (deliverable.length > 0) {
    const userIds = [...new Set(deliverable.map((notification) => notification.user_id))];
    const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
      admin.from("notification_preferences").select("user_id, push_enabled").in("user_id", userIds),
      admin
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", userIds),
    ]);
    const pushEnabled = new Set(
      (preferences ?? []).filter((row) => row.push_enabled).map((row) => row.user_id),
    );
    const devicesByUser = new Map<string, StoredSubscription[]>();
    for (const subscription of subscriptions ?? []) {
      const devices = devicesByUser.get(subscription.user_id) ?? [];
      devices.push(subscription);
      devicesByUser.set(subscription.user_id, devices);
    }

    const sentIds: string[] = [];
    const expiredIds: string[] = [];
    for (const notification of deliverable) {
      const devices = devicesByUser.get(notification.user_id) ?? [];
      if (!pushEnabled.has(notification.user_id) || devices.length === 0) {
        summary.skipped += 1;
        outcomes.set(notification.id, {
          status: pushEnabled.has(notification.user_id) ? "no_device" : "disabled",
        });
        continue;
      }
      const subject: NotificationSubject = {
        type: notification.type,
        actorName: notification.actor?.display_name ?? null,
        actorUsername: notification.actor?.username ?? null,
        listingId: notification.listing_id,
        listingTitle: notification.listing?.title ?? null,
        conversationId: notification.conversation_id,
      };
      const result = await sendPush(
        devices,
        {
          ...describeNotification(subject),
          url: notificationHref(subject),
          tag: notification.conversation_id
            ? `conversation:${notification.conversation_id}`
            : `notification:${notification.id}`,
        },
        config,
        { urgent: notification.type === "new_message" },
      );
      sentIds.push(...result.sent);
      expiredIds.push(...result.expired);
      summary.sent += result.sent.length;
      summary.expired += result.expired.length;
      summary.failed += result.failed;
      outcomes.set(
        notification.id,
        result.sent.length > 0
          ? { status: "sent" }
          : {
              status: "failed",
              detail:
                result.errors[0] ?? (result.expired.length > 0 ? "abonnement expiré" : undefined),
            },
      );
    }

    if (expiredIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }
    if (sentIds.length > 0) {
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", [...new Set(sentIds)]);
    }
  }

  await recordOutcomes(admin, outcomes);
  return summary;
}

type PushStatus = "sent" | "no_device" | "disabled" | "failed" | "skipped";

/** Garde le résultat de l'envoi sur chaque notification (diagnostic). */
async function recordOutcomes(
  admin: TypedSupabaseClient,
  outcomes: Map<string, { status: PushStatus; detail?: string }>,
) {
  const groups = new Map<string, { status: PushStatus; detail: string | null; ids: string[] }>();
  for (const [id, { status, detail }] of outcomes) {
    const key = `${status}|${detail ?? ""}`;
    const group = groups.get(key) ?? { status, detail: detail ?? null, ids: [] };
    group.ids.push(id);
    groups.set(key, group);
  }
  await Promise.all(
    [...groups.values()].map(({ status, detail, ids }) =>
      admin
        .from("notifications")
        .update({ push_status: status, push_detail: detail })
        .in("id", ids),
    ),
  );
}
