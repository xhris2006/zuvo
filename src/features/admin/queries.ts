import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/features/auth/session";
import type { ReportStatus, ReportTargetType } from "@/features/moderation/schemas";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_PAGE_SIZE = 20;

class AdminQueryError extends Error {
  constructor() {
    super("admin_query_failed");
  }
}

/**
 * Rôle administrateur de l'utilisateur connecté, lu en base (table
 * user_roles, RLS). Sert uniquement à l'affichage : chaque action est
 * revérifiée par la base de données.
 */
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !error && Boolean(data);
});

/** Page réservée à l'administration : 404 pour tout autre utilisateur. */
export async function requireAdmin(returnTo: string) {
  const session = await requireUser(returnTo);
  if (!(await isCurrentUserAdmin())) notFound();
  return session;
}

const statsSchema = z.object({
  users: z.number(),
  suspended_users: z.number(),
  active_listings: z.number(),
  removed_listings: z.number(),
  pending_reports: z.number(),
  in_review_reports: z.number(),
  new_users_7d: z.number(),
  new_listings_7d: z.number(),
});

export type AdminStats = z.infer<typeof statsSchema>;

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();
  const { data, error } = await supabase.rpc("admin_get_stats");
  const parsed = statsSchema.safeParse(data);
  if (error || !parsed.success) throw new AdminQueryError();
  return parsed.data;
}

// -----------------------------------------------------------------------------
// Signalements
// -----------------------------------------------------------------------------
type ListingTarget = {
  kind: "listing";
  id: string;
  title: string;
  status: Database["public"]["Enums"]["listing_status"];
  removedAt: string | null;
  removedReason: string | null;
  seller: { username: string; displayName: string } | null;
};

type UserTarget = {
  kind: "user";
  id: string;
  username: string;
  displayName: string;
  suspendedAt: string | null;
};

type MessageTarget = { kind: "message"; id: string };

export type AdminReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: Database["public"]["Enums"]["report_reason"];
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  resolutionNote: string | null;
  reporter: { username: string; displayName: string } | null;
  /** null : la cible a été supprimée. */
  target: ListingTarget | UserTarget | MessageTarget | null;
};

export async function getAdminReports(
  status: ReportStatus,
  page: number,
): Promise<{ items: AdminReport[]; total: number; pageSize: number }> {
  const pageSize = ADMIN_PAGE_SIZE;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();

  // Champs internes (note, auteur) lus par une fonction réservée à
  // l'administration : l'auteur d'un signalement n'y a pas accès.
  const { data, error } = await supabase.rpc("admin_list_reports", {
    p_status: status,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new AdminQueryError();
  const rows = data ?? [];
  const count = rows[0]?.total_count ?? 0;

  const idsOf = (type: ReportTargetType) =>
    rows.filter((row) => row.target_type === type).map((row) => row.target_id);
  const listingIds = idsOf("listing");
  const userIds = idsOf("user");

  const [listings, users] = await Promise.all([
    listingIds.length
      ? supabase
          .from("listings")
          .select(
            "id, title, status, removed_at, removed_reason, seller:profiles!listings_seller_id_fkey(username, display_name)",
          )
          .in("id", listingIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, username, display_name, suspended_at")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  const listingById = new Map((listings.data ?? []).map((row) => [row.id, row]));
  const userById = new Map((users.data ?? []).map((row) => [row.id, row]));

  const items = rows.map((row): AdminReport => {
    let target: AdminReport["target"] = null;
    if (row.target_type === "listing") {
      const listing = listingById.get(row.target_id);
      target = listing
        ? {
            kind: "listing",
            id: listing.id,
            title: listing.title,
            status: listing.status,
            removedAt: listing.removed_at,
            removedReason: listing.removed_reason,
            seller: listing.seller
              ? { username: listing.seller.username, displayName: listing.seller.display_name }
              : null,
          }
        : null;
    } else if (row.target_type === "user") {
      const user = userById.get(row.target_id);
      target = user
        ? {
            kind: "user",
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            suspendedAt: user.suspended_at,
          }
        : null;
    } else {
      target = { kind: "message", id: row.target_id };
    }
    return {
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      resolutionNote: row.resolution_note,
      reporter:
        row.reporter_username && row.reporter_display_name
          ? { username: row.reporter_username, displayName: row.reporter_display_name }
          : null,
      target,
    };
  });
  return { items, total: Number(count), pageSize };
}

// -----------------------------------------------------------------------------
// Utilisateurs
// -----------------------------------------------------------------------------
export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  city: string | null;
  createdAt: string;
  suspendedAt: string | null;
};

/** Recherche par nom d'utilisateur ou nom affiché (comptes suspendus inclus). */
export async function searchUsersForAdmin(
  query: string,
  page: number,
): Promise<{ items: AdminUser[]; total: number; pageSize: number }> {
  const pageSize = ADMIN_PAGE_SIZE;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();

  let request = supabase
    .from("profiles")
    .select("id, username, display_name, city, created_at, suspended_at", { count: "exact" });
  // Caractères spéciaux de PostgREST et des motifs LIKE retirés de la saisie.
  const term = query.replace(/[%_,.()*\\:"']/g, " ").trim();
  if (term) request = request.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new AdminQueryError();
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      city: row.city,
      createdAt: row.created_at,
      suspendedAt: row.suspended_at,
    })),
    total: count ?? 0,
    pageSize,
  };
}

// -----------------------------------------------------------------------------
// Journal
// -----------------------------------------------------------------------------
export type ModerationLogEntry = {
  id: string;
  action: Database["public"]["Enums"]["moderation_action_type"];
  targetType: ReportTargetType;
  targetId: string;
  note: string | null;
  createdAt: string;
  admin: { username: string; displayName: string } | null;
};

export async function getModerationLog(
  page: number,
): Promise<{ items: ModerationLogEntry[]; total: number; pageSize: number }> {
  const pageSize = ADMIN_PAGE_SIZE * 2;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("moderation_actions")
    .select(
      "id, action, target_type, target_id, note, created_at, admin:profiles!moderation_actions_admin_id_fkey(username, display_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new AdminQueryError();
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      note: row.note,
      createdAt: row.created_at,
      admin: row.admin
        ? { username: row.admin.username, displayName: row.admin.display_name }
        : null,
    })),
    total: count ?? 0,
    pageSize,
  };
}
