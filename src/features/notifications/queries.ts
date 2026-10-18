import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/features/auth/session";
import { getUnreadMessagesCount } from "@/features/messaging/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UnreadCounts = { messages: number; notifications: number };

/** Nombre de notifications non lues (badge de navigation). */
export const getUnreadNotificationsCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
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
