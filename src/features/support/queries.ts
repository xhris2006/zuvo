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
  response: string | null;
  createdAt: string;
  handledAt: string | null;
  listing: { id: string; title: string } | null;
};

const statusOf = (value: string): SupportStatus =>
  value === "answered" || value === "closed" ? value : "open";

/** Demandes de l'utilisateur connecté, les plus récentes d'abord (RLS : les siennes). */
export async function getMySupportRequests(userId: string): Promise<MySupportRequest[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("support_requests")
    .select(
      "id, kind, subject, message, status, response, created_at, handled_at, listing:listings(id, title)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return data.map((row) => ({
    id: row.id,
    kind: row.kind === "appeal" ? "appeal" : "contact",
    subject: row.subject,
    message: row.message,
    status: statusOf(row.status),
    response: row.response,
    createdAt: row.created_at,
    handledAt: row.handled_at,
    listing: row.listing ? { id: row.listing.id, title: row.listing.title } : null,
  }));
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
