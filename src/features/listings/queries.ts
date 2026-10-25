import "server-only";
import { cache } from "react";
import { defaultCategories } from "@/features/categories/data";
import type { SearchFilters } from "@/features/search/schema";
import { buildPrefixTsQuery } from "@/features/search/text-query";
import type { Database } from "@/lib/supabase/database.types";
import { searchLimits } from "@/config/limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listingImageUrl } from "./image-url";
import type { ListingCardData } from "./types";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ImageRow = { id?: string; storage_path: string; sort_order: number };

export class ListingQueryError extends Error {
  constructor() {
    super("listing_query_failed");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CARD_COLUMNS =
  "id, seller_id, title, price, city, condition, status, published_at, images:listing_images(storage_path, sort_order)";

type CardRow = Pick<
  ListingRow,
  "id" | "seller_id" | "title" | "price" | "city" | "condition" | "status"
> & {
  images: ImageRow[];
};

function sortImages<T extends ImageRow>(images: T[]): T[] {
  return [...images].sort((a, b) => a.sort_order - b.sort_order);
}

export function toListingCard(row: CardRow): ListingCardData {
  const main = sortImages(row.images)[0];
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    price: row.price,
    citySlug: row.city,
    condition: row.condition,
    status: row.status,
    imageUrl: main ? listingImageUrl(main.storage_path) : null,
  };
}

// -----------------------------------------------------------------------------
// Catégories
// -----------------------------------------------------------------------------
export type Category = { id: string | null; slug: string; name: string };

/** Catégories actives (base de données, ou liste initiale si non configurée). */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return defaultCategories.map((category) => ({ ...category, id: null }));
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new ListingQueryError();
  return data;
});

// -----------------------------------------------------------------------------
// Listes d'annonces
// -----------------------------------------------------------------------------
export async function getRecentListings(limit = 12): Promise<ListingCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new ListingQueryError();
  return data.map(toListingCard);
}

/** Toutes les annonces de l'utilisateur connecté, y compris brouillons. */
export async function getOwnListings(userId: string): Promise<ListingCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(CARD_COLUMNS)
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new ListingQueryError();
  return data.map(toListingCard);
}

/** Annonces en vente ou réservées d'un vendeur (profil public). */
export async function getSellerListings(
  sellerId: string,
  page = 1,
  pageSize = 24,
): Promise<{ items: ListingCardData[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("listings")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("seller_id", sellerId)
    .in("status", ["active", "reserved"])
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new ListingQueryError();
  return { items: data.map(toListingCard), total: count ?? 0 };
}

// -----------------------------------------------------------------------------
// Détail
// -----------------------------------------------------------------------------
const DETAIL_COLUMNS = `
  id, seller_id, title, description, price, condition, city, status, removed_at,
  removed_reason, created_at, updated_at, published_at,
  category:categories(id, slug, name),
  seller:profiles!seller_id(id, username, display_name, avatar_path, city, created_at, verified_at),
  images:listing_images(id, storage_path, sort_order)
`;

export type ListingDetail = Awaited<ReturnType<typeof fetchListingDetail>>;

async function fetchListingDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !UUID.test(id)) return null;
  const { data, error } = await supabase
    .from("listings")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ListingQueryError();
  if (!data) return null;
  return {
    ...data,
    images: sortImages(data.images).map((image) => ({
      ...image,
      url: listingImageUrl(image.storage_path),
    })),
  };
}

/** Annonce visible par l'utilisateur courant (RLS), ou null. */
export const getListingDetail = cache(fetchListingDetail);

export async function getSimilarListings(
  listingId: string,
  categoryId: string | null,
): Promise<ListingCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !categoryId) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .eq("category_id", categoryId)
    .neq("id", listingId)
    .order("published_at", { ascending: false })
    .limit(8);
  if (error) return [];
  return data.map(toListingCard);
}

// -----------------------------------------------------------------------------
// Recherche
// -----------------------------------------------------------------------------
export type SearchResult = { items: ListingCardData[]; total: number; pageSize: number };

/** Recherche paginée parmi les annonces en vente. */
export async function searchListings(filters: SearchFilters): Promise<SearchResult> {
  const pageSize = searchLimits.pageSize;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0, pageSize };

  let query = supabase
    .from("listings")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "active");

  if (filters.q) {
    const tsQuery = buildPrefixTsQuery(filters.q);
    if (tsQuery) query = query.textSearch("search_vector", tsQuery, { config: "french_unaccent" });
  }
  if (filters.category) {
    const category = (await getCategories()).find((item) => item.slug === filters.category);
    if (!category?.id) return { items: [], total: 0, pageSize };
    query = query.eq("category_id", category.id);
  }
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);

  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    query = query.order("price", { ascending: filters.sort === "price_asc" });
  }
  query = query.order("published_at", { ascending: false });

  const from = (filters.page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  // Page au-delà des résultats : PostgREST répond 416, on renvoie une liste vide.
  if (error && error.code !== "PGRST103") throw new ListingQueryError();
  return { items: (data ?? []).map(toListingCard), total: count ?? 0, pageSize };
}

// -----------------------------------------------------------------------------
// Favoris et fil des abonnements
// -----------------------------------------------------------------------------

/** Identifiants des annonces mises en favori par l'utilisateur, parmi une liste. */
export async function getFavoriteIds(userId: string | null, listingIds: string[]) {
  if (!userId || listingIds.length === 0) return new Set<string>();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new Set<string>();
  const { data } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .in("listing_id", listingIds);
  return new Set((data ?? []).map((row) => row.listing_id));
}

/** Favoris de l'utilisateur connecté (annonces encore visibles), paginés. */
export async function getFavoriteListings(userId: string, page = 1): Promise<SearchResult> {
  const pageSize = searchLimits.pageSize;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0, pageSize };
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("favorites")
    .select(`created_at, listing:listings(${CARD_COLUMNS})`, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new ListingQueryError();
  const items = (data ?? []).flatMap((row) => (row.listing ? [toListingCard(row.listing)] : []));
  return { items, total: count ?? 0, pageSize };
}

/** Annonces récentes des profils suivis par l'utilisateur. */
export async function getFollowedFeed(userId: string, page = 1): Promise<SearchResult> {
  const pageSize = searchLimits.pageSize;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0, pageSize };

  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .limit(1000);
  if (followsError) throw new ListingQueryError();
  const sellerIds = (follows ?? []).map((row) => row.following_id);
  if (sellerIds.length === 0) return { items: [], total: 0, pageSize };

  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("listings")
    .select(CARD_COLUMNS, { count: "exact" })
    .in("seller_id", sellerIds)
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error && error.code !== "PGRST103") throw new ListingQueryError();
  return { items: (data ?? []).map(toListingCard), total: count ?? 0, pageSize };
}
