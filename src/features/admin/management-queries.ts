import "server-only";
import { z } from "zod";
import type { ListingStatus } from "@/features/listings/constants";
import { listingImageUrl } from "@/features/listings/image-url";
import { CITY_SLUG_PATTERN } from "@/features/locations/names";
import { buildPrefixTsQuery } from "@/features/search/text-query";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_PAGE_SIZE, type StaffRole } from "./queries";

class ManagementQueryError extends Error {
  constructor() {
    super("admin_management_query_failed");
  }
}

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new ManagementQueryError();
  return supabase;
}

type Page<T> = { items: T[]; total: number; pageSize: number };

// -----------------------------------------------------------------------------
// Annonces (équipe de modération : RLS donne accès à toutes les annonces)
// -----------------------------------------------------------------------------
export const adminListingStatuses = ["draft", "active", "reserved", "sold", "withdrawn"] as const;

export type AdminListingFilters = {
  q: string;
  status: ListingStatus | null;
  category: string | null;
  city: string | null;
  seller: string | null;
  /** « retirees » : retirées par la modération ; « en-ligne » : non retirées. */
  moderation: "retirees" | "en-ligne" | null;
  page: number;
};

const filtersSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(adminListingStatuses).nullable().catch(null),
  category: z.string().regex(CITY_SLUG_PATTERN).nullable().catch(null),
  city: z.string().regex(CITY_SLUG_PATTERN).nullable().catch(null),
  seller: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@/, ""))
    .pipe(z.string().regex(/^[a-z0-9_]{1,30}$/))
    .nullable()
    .catch(null),
  moderation: z.enum(["retirees", "en-ligne"]).nullable().catch(null),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

/** Filtres de la page « Annonces » lus dans l'URL (valeurs invalides ignorées). */
export function parseAdminListingFilters(
  raw: Record<string, string | string[] | undefined>,
): AdminListingFilters {
  const first = (key: string) => {
    const value = raw[key];
    const text = Array.isArray(value) ? value[0] : value;
    return text === undefined || text === "" ? null : text;
  };
  return filtersSchema.parse({
    q: first("q") ?? "",
    status: first("statut"),
    category: first("categorie"),
    city: first("ville"),
    seller: first("vendeur"),
    moderation: first("moderation"),
    page: first("page") ?? 1,
  });
}

export type AdminListing = {
  id: string;
  title: string;
  status: ListingStatus;
  price: number | null;
  citySlug: string | null;
  createdAt: string;
  removedAt: string | null;
  removedReason: string | null;
  imageUrl: string | null;
  seller: { id: string; username: string; displayName: string } | null;
  category: string | null;
};

export async function getAdminListings(filters: AdminListingFilters): Promise<Page<AdminListing>> {
  const pageSize = ADMIN_PAGE_SIZE;
  const supabase = await client();
  const empty = { items: [], total: 0, pageSize };

  let query = supabase
    .from("listings")
    .select(
      "id, title, status, price, city, created_at, removed_at, removed_reason, category:categories(name), seller:profiles!listings_seller_id_fkey(id, username, display_name), images:listing_images(storage_path, sort_order)",
      { count: "exact" },
    );

  if (filters.q) {
    const tsQuery = buildPrefixTsQuery(filters.q);
    if (tsQuery) query = query.textSearch("search_vector", tsQuery, { config: "french_unaccent" });
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.moderation === "retirees") query = query.not("removed_at", "is", null);
  if (filters.moderation === "en-ligne") query = query.is("removed_at", null);
  if (filters.category) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    if (!data) return empty;
    query = query.eq("category_id", data.id);
  }
  if (filters.seller) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", filters.seller)
      .maybeSingle();
    if (!data) return empty;
    query = query.eq("seller_id", data.id);
  }

  const from = (filters.page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new ManagementQueryError();

  return {
    items: (data ?? []).map((row) => {
      const main = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        price: row.price,
        citySlug: row.city,
        createdAt: row.created_at,
        removedAt: row.removed_at,
        removedReason: row.removed_reason,
        imageUrl: main ? listingImageUrl(main.storage_path) : null,
        seller: row.seller
          ? {
              id: row.seller.id,
              username: row.seller.username,
              displayName: row.seller.display_name,
            }
          : null,
        category: row.category?.name ?? null,
      };
    }),
    total: count ?? 0,
    pageSize,
  };
}

// -----------------------------------------------------------------------------
// Catégories et villes (administrateurs : RLS montre aussi les éléments désactivés)
// -----------------------------------------------------------------------------
export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  activeListings: number;
};

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, is_active, sort_order, listings(count)")
    .is("parent_id", null)
    .eq("listings.status", "active")
    .order("sort_order")
    .order("name");
  if (error) throw new ManagementQueryError();
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    activeListings: row.listings[0]?.count ?? 0,
  }));
}

export type AdminCity = {
  slug: string;
  name: string;
  region: string;
  isActive: boolean;
  sortOrder: number;
};

export async function getAdminCities(): Promise<AdminCity[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("cities")
    .select("slug, name, region, is_active, sort_order")
    .order("sort_order")
    .order("name");
  if (error) throw new ManagementQueryError();
  return data.map((row) => ({
    slug: row.slug,
    name: row.name,
    region: row.region,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

// -----------------------------------------------------------------------------
// Équipe
// -----------------------------------------------------------------------------
export type StaffMember = {
  userId: string;
  role: StaffRole;
  grantedAt: string;
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
};

export async function getStaffMembers(): Promise<StaffMember[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role, granted_at, profile:profiles(username, display_name, avatar_path)")
    .order("granted_at");
  if (error) throw new ManagementQueryError();
  return data.map((row) => ({
    userId: row.user_id,
    role: row.role,
    grantedAt: row.granted_at,
    username: row.profile?.username ?? null,
    displayName: row.profile?.display_name ?? null,
    avatarPath: row.profile?.avatar_path ?? null,
  }));
}

// -----------------------------------------------------------------------------
// Message global
// -----------------------------------------------------------------------------
type AnnouncementRow = Database["public"]["Tables"]["site_announcements"]["Row"];

export type AdminAnnouncement = {
  id: string;
  kind: "info" | "maintenance";
  message: string;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export function toAnnouncement(row: AnnouncementRow): AdminAnnouncement {
  return {
    id: row.id,
    kind: row.kind === "maintenance" ? "maintenance" : "info",
    message: row.message,
    linkUrl: row.link_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getAdminAnnouncements(): Promise<AdminAnnouncement[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("site_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new ManagementQueryError();
  return data.map(toAnnouncement);
}

// -----------------------------------------------------------------------------
// Journal de configuration (administrateurs)
// -----------------------------------------------------------------------------
export type ConfigActivity = {
  id: string;
  entity: string;
  action: string;
  summary: string | null;
  createdAt: string;
  adminUsername: string | null;
};

export async function getConfigActivity(page: number): Promise<Page<ConfigActivity>> {
  const pageSize = ADMIN_PAGE_SIZE * 2;
  const supabase = await client();
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("admin_activity")
    .select("id, entity, action, summary, created_at, admin:profiles(username)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new ManagementQueryError();
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      entity: row.entity,
      action: row.action,
      summary: row.summary,
      createdAt: row.created_at,
      adminUsername: row.admin?.username ?? null,
    })),
    total: count ?? 0,
    pageSize,
  };
}
