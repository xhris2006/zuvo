import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/features/auth/session";
import type { ReportStatus, ReportTargetType } from "@/features/moderation/schemas";
import { Constants, type Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_PAGE_SIZE = 20;

class AdminQueryError extends Error {
  constructor() {
    super("admin_query_failed");
  }
}

export type StaffRole = "admin" | "moderator";

/**
 * Rôle de l'utilisateur connecté dans l'équipe (administrateur ou
 * modérateur), lu en base (table user_roles, RLS). Sert uniquement à
 * l'affichage : chaque action est revérifiée par la base de données.
 */
export const getCurrentStaffRole = cache(async (): Promise<StaffRole | null> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error || !data) return null;
  const roles = data.map((row) => row.role);
  if (roles.includes("admin")) return "admin";
  return roles.includes("moderator") ? "moderator" : null;
});

/** Administrateur (droits complets : catégories, rôles, configuration…). */
export const isCurrentUserAdmin = cache(
  async (): Promise<boolean> => (await getCurrentStaffRole()) === "admin",
);

/** Membre de l'équipe de modération (administrateur ou modérateur). */
export const isCurrentUserStaff = cache(
  async (): Promise<boolean> => (await getCurrentStaffRole()) !== null,
);

/** Page réservée aux administrateurs : 404 pour tout autre utilisateur. */
export async function requireAdmin(returnTo: string) {
  const session = await requireUser(returnTo);
  if (!(await isCurrentUserAdmin())) notFound();
  return session;
}

/** Page ouverte à l'équipe de modération : 404 pour tout autre utilisateur. */
export async function requireStaff(returnTo: string) {
  const session = await requireUser(returnTo);
  const role = await getCurrentStaffRole();
  if (!role) notFound();
  return { ...session, role };
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
  suspendedUntil: string | null;
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
          .select("id, username, display_name, suspended_at, suspended_until")
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
            suspendedUntil: user.suspended_until,
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
  avatarPath: string | null;
  city: string | null;
  createdAt: string;
  suspendedAt: string | null;
  suspendedUntil: string | null;
  /** Membre de l'équipe (aucune action de modération possible sur lui). */
  role: StaffRole | null;
};

/** Recherche par nom d'utilisateur ou nom affiché (comptes suspendus inclus). */
export async function searchUsersForAdmin(
  query: string,
  page: number,
  onlySuspended = false,
): Promise<{ items: AdminUser[]; total: number; pageSize: number }> {
  const pageSize = ADMIN_PAGE_SIZE;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();

  let request = supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_path, city, created_at, suspended_at, suspended_until",
      { count: "exact" },
    );
  if (onlySuspended) {
    request = request
      .not("suspended_at", "is", null)
      .or(`suspended_until.is.null,suspended_until.gt.${new Date().toISOString()}`);
  }
  // Caractères spéciaux de PostgREST et des motifs LIKE retirés de la saisie.
  const term = query.replace(/[%_,.()*\\:"']/g, " ").trim();
  if (term) request = request.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new AdminQueryError();
  const rows = data ?? [];
  const roles = await rolesOf(
    supabase,
    rows.map((row) => row.id),
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarPath: row.avatar_path,
      city: row.city,
      createdAt: row.created_at,
      suspendedAt: row.suspended_at,
      suspendedUntil: row.suspended_until,
      role: roles.get(row.id) ?? null,
    })),
    total: count ?? 0,
    pageSize,
  };
}

/** Rôles dans l'équipe d'une liste d'utilisateurs (RLS : lisibles par l'équipe). */
async function rolesOf(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userIds: string[],
): Promise<Map<string, StaffRole>> {
  const roles = new Map<string, StaffRole>();
  if (userIds.length === 0) return roles;
  const { data } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
  for (const row of data ?? []) {
    if (row.role === "admin" || !roles.has(row.user_id)) roles.set(row.user_id, row.role);
  }
  return roles;
}

const overviewSchema = z.object({
  listings_active: z.number(),
  listings_sold: z.number(),
  listings_draft: z.number(),
  listings_removed: z.number(),
  reports_received: z.number(),
  reports_made: z.number(),
  blocked_by: z.number(),
  conversations: z.number(),
  messages_sent_7d: z.number(),
  warnings: z.number(),
});

export type AdminUserOverview = z.infer<typeof overviewSchema>;

export type AdminUserDetail = {
  profile: AdminUser & { bio: string | null; verifiedAt: string | null };
  isAdmin: boolean;
  /**
   * Compte de connexion (lu en service_role, administrateurs uniquement) ;
   * null si la clé serveur manque ou pour un modérateur.
   */
  account: { email: string | null; lastSignInAt: string | null; confirmed: boolean } | null;
  overview: AdminUserOverview;
  listings: {
    id: string;
    title: string;
    status: Database["public"]["Enums"]["listing_status"];
    price: number | null;
    createdAt: string;
    removedAt: string | null;
    removedReason: string | null;
  }[];
  reports: {
    id: string;
    targetType: ReportTargetType;
    reason: Database["public"]["Enums"]["report_reason"];
    status: ReportStatus;
    createdAt: string;
  }[];
  history: {
    id: string;
    action: Database["public"]["Enums"]["moderation_action_type"];
    targetType: ReportTargetType;
    note: string | null;
    createdAt: string;
    adminUsername: string | null;
  }[];
};

/**
 * Fiche d'un compte pour l'administration : profil, chiffres, annonces,
 * signalements le concernant et historique de modération. Aucun message
 * privé n'est lu. À n'appeler qu'après requireAdmin().
 */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (!z.uuid().safeParse(userId).success) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();

  const [{ data: profile, error }, overview, { data: listings }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_path, bio, city, created_at, suspended_at, suspended_until, verified_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("admin_get_user_overview", { p_user_id: userId }),
    supabase
      .from("listings")
      .select("id, title, status, price, created_at, removed_at, removed_reason")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (error) throw new AdminQueryError();
  if (!profile) return null;
  const parsedOverview = overviewSchema.safeParse(overview.data);
  if (overview.error || !parsedOverview.success) throw new AdminQueryError();

  const listingIds = (listings ?? []).map((listing) => listing.id);
  const targets = [userId, ...listingIds];
  const [{ data: reports }, { data: history }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .in("target_id", targets)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("moderation_actions")
      .select(
        "id, action, target_type, note, created_at, admin:profiles!moderation_actions_admin_id_fkey(username)",
      )
      .in("target_id", targets)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Rôle : lisible par l'équipe (RLS). Adresse e-mail : table non exposée à
  // l'API, lue en service_role et montrée aux seuls administrateurs.
  const role = (await rolesOf(supabase, [userId])).get(userId) ?? null;
  const isAdmin = role === "admin";
  let account: AdminUserDetail["account"] = null;
  const admin = (await isCurrentUserAdmin()) ? createSupabaseAdminClient() : null;
  if (admin) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    if (authUser?.user) {
      account = {
        email: authUser.user.email ?? null,
        lastSignInAt: authUser.user.last_sign_in_at ?? null,
        confirmed: Boolean(authUser.user.email_confirmed_at),
      };
    }
  }

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarPath: profile.avatar_path,
      bio: profile.bio,
      city: profile.city,
      createdAt: profile.created_at,
      suspendedAt: profile.suspended_at,
      suspendedUntil: profile.suspended_until,
      verifiedAt: profile.verified_at,
      role,
    },
    isAdmin,
    account,
    overview: parsedOverview.data,
    listings: (listings ?? []).map((listing) => ({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      price: listing.price,
      createdAt: listing.created_at,
      removedAt: listing.removed_at,
      removedReason: listing.removed_reason,
    })),
    reports: (reports ?? []).map((report) => ({
      id: report.id,
      targetType: report.target_type,
      reason: report.reason,
      status: report.status,
      createdAt: report.created_at,
    })),
    history: (history ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      targetType: entry.target_type,
      note: entry.note,
      createdAt: entry.created_at,
      adminUsername: entry.admin?.username ?? null,
    })),
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

export type ModerationLogFilters = {
  action: ModerationActionType | null;
  targetType: ReportTargetType | null;
  /** Nom d'utilisateur du membre de l'équipe. */
  admin: string | null;
  /** Jours au format AAAA-MM-JJ (heure du Cameroun). */
  from: string | null;
  to: string | null;
};

type ModerationActionType = Database["public"]["Enums"]["moderation_action_type"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Filtres du journal lus dans l'URL (valeurs invalides ignorées). */
export function parseModerationLogFilters(
  raw: Record<string, string | string[] | undefined>,
): ModerationLogFilters {
  const first = (key: string) => {
    const value = raw[key];
    const text = (Array.isArray(value) ? value[0] : value)?.trim();
    return text ? text : null;
  };
  const action = first("action");
  const target = first("cible");
  const admin = first("membre")?.replace(/^@/, "").toLowerCase() ?? null;
  const from = first("du");
  const to = first("au");
  return {
    action: Constants.public.Enums.moderation_action_type.find((value) => value === action) ?? null,
    targetType: Constants.public.Enums.report_target_type.find((value) => value === target) ?? null,
    admin: admin && /^[a-z0-9_]{1,30}$/.test(admin) ? admin : null,
    from: from && DAY.test(from) ? from : null,
    to: to && DAY.test(to) ? to : null,
  };
}

const noFilters: ModerationLogFilters = {
  action: null,
  targetType: null,
  admin: null,
  from: null,
  to: null,
};

export async function getModerationLog(
  page: number,
  filters: ModerationLogFilters = noFilters,
): Promise<{ items: ModerationLogEntry[]; total: number; pageSize: number }> {
  const pageSize = ADMIN_PAGE_SIZE * 2;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AdminQueryError();

  let query = supabase
    .from("moderation_actions")
    .select(
      "id, action, target_type, target_id, note, created_at, admin:profiles!moderation_actions_admin_id_fkey(username, display_name)",
      { count: "exact" },
    );
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.targetType) query = query.eq("target_type", filters.targetType);
  // Jours entiers à l'heure du Cameroun (UTC+1).
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+01:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999+01:00`);
  if (filters.admin) {
    const { data: member } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", filters.admin)
      .maybeSingle();
    if (!member) return { items: [], total: 0, pageSize };
    query = query.eq("admin_id", member.id);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
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
