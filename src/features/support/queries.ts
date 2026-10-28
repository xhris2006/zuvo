import "server-only";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupportStatus } from "./schemas";

export type MySupportRequest = {
  id: string;
  kind: "contact" | "appeal";
  subject: string;
  message: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  listing: { id: string; title: string } | null;
  /** Dernier message de la conversation (sinon, le message d'ouverture). */
  lastMessage: { body: string; fromStaff: boolean; createdAt: string } | null;
};

const statusOf = (value: string): SupportStatus =>
  value === "answered" || value === "closed" ? value : "open";

/** Demandes de l'utilisateur connecté, les plus récemment actives d'abord (RLS : les siennes). */
export async function getMySupportRequests(userId: string): Promise<MySupportRequest[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("support_requests")
    .select(
      "id, kind, subject, message, status, created_at, updated_at, listing:listings(id, title), messages:support_messages(body, from_staff, created_at)",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "support_messages", ascending: false })
    .limit(1, { referencedTable: "support_messages" })
    .limit(30);
  if (error) return [];
  return data.map((row) => {
    const last = row.messages[0];
    return {
      id: row.id,
      kind: row.kind === "appeal" ? "appeal" : "contact",
      subject: row.subject,
      message: row.message,
      status: statusOf(row.status),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      listing: row.listing ? { id: row.listing.id, title: row.listing.title } : null,
      lastMessage: last
        ? { body: last.body, fromStaff: last.from_staff, createdAt: last.created_at }
        : null,
    };
  });
}

export type SupportThreadMessage = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
};

export type SupportThread = {
  id: string;
  userId: string;
  kind: "contact" | "appeal";
  subject: string;
  status: SupportStatus;
  createdAt: string;
  author: { id: string; username: string; displayName: string } | null;
  listing: {
    id: string;
    title: string;
    removedAt: string | null;
    removedReason: string | null;
  } | null;
  /** Message d'ouverture suivi des échanges, dans l'ordre chronologique. */
  messages: SupportThreadMessage[];
};

/**
 * Conversation d'une demande d'assistance, lue avec la session : son auteur
 * ou l'équipe uniquement (RLS). Null si introuvable ou inaccessible.
 */
export async function getSupportThread(requestId: string): Promise<SupportThread | null> {
  if (!z.uuid().safeParse(requestId).success) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("support_requests")
    .select(
      `id, user_id, kind, subject, message, status, created_at,
       author:profiles!support_requests_user_id_fkey(id, username, display_name),
       listing:listings(id, title, removed_at, removed_reason),
       messages:support_messages(id, body, from_staff, created_at)`,
    )
    .eq("id", requestId)
    .order("created_at", { referencedTable: "support_messages", ascending: true })
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    kind: data.kind === "appeal" ? "appeal" : "contact",
    subject: data.subject,
    status: statusOf(data.status),
    createdAt: data.created_at,
    author: data.author
      ? {
          id: data.author.id,
          username: data.author.username,
          displayName: data.author.display_name,
        }
      : null,
    listing: data.listing
      ? {
          id: data.listing.id,
          title: data.listing.title,
          removedAt: data.listing.removed_at,
          removedReason: data.listing.removed_reason,
        }
      : null,
    messages: [
      { id: `${data.id}-start`, body: data.message, fromStaff: false, createdAt: data.created_at },
      ...data.messages.map((message) => ({
        id: message.id,
        body: message.body,
        fromStaff: message.from_staff,
        createdAt: message.created_at,
      })),
    ],
  };
}

/**
 * Notifications de la personne connectée liées à cette conversation, marquées
 * comme lues à l'ouverture (RLS : les siennes uniquement).
 */
export async function markSupportNotificationsRead(userId: string, requestId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("support_request_id", requestId)
    .eq("is_read", false);
}

/** Annonce de l'utilisateur retirée par la modération, qu'il peut contester. */
export async function getAppealableListing(userId: string, listingId: string) {
  if (!z.uuid().safeParse(listingId).success) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("listings")
    .select("id, title, removed_reason, removed_at")
    .eq("id", listingId)
    .eq("seller_id", userId)
    .not("removed_at", "is", null)
    .maybeSingle();
  return data;
}
