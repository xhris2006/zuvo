import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ChatMessage, MESSAGES_PAGE_SIZE } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MessagingQueryError extends Error {
  constructor() {
    super("messaging_query_failed");
  }
}

export async function getConversations(page = 1, pageSize = 30) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_my_conversations", {
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new MessagingQueryError();
  return data;
}

export type ConversationSummary = Awaited<ReturnType<typeof getConversations>>[number];

/** Conversation visible par l'utilisateur (RLS : participants uniquement). */
export const getConversation = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !UUID.test(id)) return null;
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, buyer_id, seller_id, listing_id,
       listing:listings(id, title, price, status, images:listing_images(storage_path, sort_order)),
       buyer:profiles!conversations_buyer_id_fkey(id, username, display_name, avatar_path),
       seller:profiles!conversations_seller_id_fkey(id, username, display_name, avatar_path)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new MessagingQueryError();
  return data;
});

/** Derniers messages d'une conversation, du plus ancien au plus récent. */
export async function getMessages(conversationId: string, before?: string): Promise<ChatMessage[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw new MessagingQueryError();
  return data.reverse();
}

/** Nombre de messages reçus non lus (badge de navigation). */
export const getUnreadMessagesCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return 0;
  const { data, error } = await supabase.rpc("get_unread_messages_count");
  return error ? 0 : data;
});
