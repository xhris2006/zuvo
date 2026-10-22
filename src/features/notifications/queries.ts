import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/features/auth/session";
import { getUnreadMessagesCount } from "@/features/messaging/queries";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type NotificationSubject, describeNotification, notificationHref } from "./content";

export type UnreadCounts = { messages: number; notifications: number };

/**
 * Nombre de notifications non lues (badge de navigation). Les nouveaux
 * messages ont leur propre compteur : leurs notifications servent à l'envoi
 * push et ne sont pas comptées ici.
 */
export const getUnreadNotificationsCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .neq("type", "new_message");
  return error ? 0 : (count ?? 0);
});

/** Compteurs des badges ; une indisponibilité affiche simplement zéro. */
export async function getUnreadCounts(): Promise<UnreadCounts> {
  try {
    const [messages, notifications] = await Promise.all([
      getUnreadMessagesCount(),
      getUnreadNotificationsCount(),
    ]);
    return { messages, notifications };
  } catch {
    return { messages: 0, notifications: 0 };
  }
}

export const NOTIFICATIONS_PAGE_SIZE = 30;

export type NotificationItem = NotificationSubject & {
  id: string;
  isRead: boolean;
  createdAt: string;
  actorAvatarPath: string | null;
  title: string;
  body: string;
  href: string;
};

class NotificationsQueryError extends Error {
  constructor() {
    super("notifications_query_failed");
  }
}

/** Notifications de l'utilisateur connecté, les plus récentes d'abord. */
export async function getNotifications(page = 1): Promise<{
  items: NotificationItem[];
  total: number;
  pageSize: number;
}> {
  const pageSize = NOTIFICATIONS_PAGE_SIZE;
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return { items: [], total: 0, pageSize };

  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("notifications")
    .select(
      `id, type, is_read, created_at, listing_id, conversation_id, note,
       actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_path),
       listing:listings(title)`,
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .neq("type", "new_message")
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new NotificationsQueryError();

  const items = (data ?? []).map((row): NotificationItem => {
    const subject: NotificationSubject = {
      type: row.type,
      actorName: row.actor?.display_name ?? null,
      actorUsername: row.actor?.username ?? null,
      listingId: row.listing_id,
      listingTitle: row.listing?.title ?? null,
      conversationId: row.conversation_id,
      note: row.note,
    };
    return {
      ...subject,
      ...describeNotification(subject),
      id: row.id,
      isRead: row.is_read,
      createdAt: row.created_at,
      actorAvatarPath: row.actor?.avatar_path ?? null,
      href: notificationHref(subject),
    };
  });
  return { items, total: count ?? 0, pageSize };
}

export type NotificationPreferences = Pick<
  Database["public"]["Tables"]["notification_preferences"]["Row"],
  "new_message" | "new_follower" | "followed_user_listing" | "listing_activity" | "push_enabled"
>;

/** Préférences de l'utilisateur connecté (valeurs par défaut si absentes). */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const defaults: NotificationPreferences = {
    new_message: true,
    new_follower: true,
    followed_user_listing: false,
    listing_activity: true,
    push_enabled: false,
  };
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return defaults;
  const { data } = await supabase
    .from("notification_preferences")
    .select("new_message, new_follower, followed_user_listing, listing_activity, push_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ?? defaults;
}

export type LastPushResult = {
  pushedAt: string;
  status: string | null;
  detail: string | null;
};

/** Dernière notification de l'utilisateur traitée par l'envoi push (diagnostic). */
export async function getLastPushResult(): Promise<LastPushResult | null> {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const { data, error } = await supabase
    .from("notifications")
    .select("pushed_at, push_status, push_detail")
    .eq("user_id", user.id)
    .not("pushed_at", "is", null)
    .order("pushed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.pushed_at) return null;
  return { pushedAt: data.pushed_at, status: data.push_status, detail: data.push_detail };
}
