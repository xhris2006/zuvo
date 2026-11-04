import "server-only";
import { cache } from "react";
import { buildPrefixTsQuery } from "@/features/search/text-query";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultServiceCategories, type ServiceCategory } from "./categories";
import { SERVICES_PAGE_SIZE } from "./constants";
import { serviceImageUrl } from "./image-url";
import type { ServiceSearchFilters } from "./schemas";
import type { OwnServiceData, ServiceCardData } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ServiceQueryError extends Error {
  constructor() {
    super("service_query_failed");
  }
}

const CARD_COLUMNS = `id, title, description, city, district, price, pricing_type, availability,
  published_at, featured_at,
  category:service_categories(slug, name),
  provider:profiles!services_provider_id_fkey(id, username, display_name, avatar_path, verified_at),
  images:service_images(storage_path, sort_order)`;

type CardRow = {
  id: string;
  title: string;
  description: string;
  city: string;
  district: string | null;
  price: number | null;
  pricing_type: ServiceCardData["pricingType"];
  availability: ServiceCardData["availability"];
  published_at: string;
  featured_at: string | null;
  category: { slug: string; name: string } | null;
  provider: {
    id: string;
    username: string;
    display_name: string;
    avatar_path: string | null;
    verified_at: string | null;
  } | null;
  images: Array<{ storage_path: string; sort_order: number }>;
};

function coverPath(images: CardRow["images"]): string | null {
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? null;
}

function toServiceCard(row: CardRow): ServiceCardData | null {
  // Prestataire ou catégorie invisibles (compte suspendu, catégorie désactivée).
  if (!row.provider || !row.category) return null;
  const cover = coverPath(row.images);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    citySlug: row.city,
    district: row.district,
    price: row.price,
    pricingType: row.pricing_type,
    availability: row.availability,
    category: row.category,
    provider: {
      id: row.provider.id,
      username: row.provider.username,
      displayName: row.provider.display_name,
      avatarPath: row.provider.avatar_path,
      verified: row.provider.verified_at !== null,
    },
    imageUrl: cover ? serviceImageUrl(cover) : null,
    featured: row.featured_at !== null,
    publishedAt: row.published_at,
  };
}

const toCards = (rows: CardRow[]) =>
  rows.map(toServiceCard).filter((card): card is ServiceCardData => card !== null);

/** Catégories actives, ou liste initiale si la base est indisponible. */
export const getServiceCategories = cache(async (): Promise<ServiceCategory[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [...defaultServiceCategories];
  const { data, error } = await supabase
    .from("service_categories")
    .select("slug, name, description")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) return [...defaultServiceCategories];
  return data;
});

/** Recherche avec filtres et pagination (services publics uniquement). */
export async function searchServices(
  filters: ServiceSearchFilters,
  pageSize = SERVICES_PAGE_SIZE,
): Promise<{ items: ServiceCardData[]; total: number; pageSize: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0, pageSize };
  const { data, error } = await supabase.rpc("search_services", {
    p_text: filters.q,
    p_tsquery: filters.q ? (buildPrefixTsQuery(filters.q) ?? undefined) : undefined,
    p_category: filters.category,
    p_city: filters.city,
    p_district: filters.district,
    p_min_price: filters.minPrice,
    p_max_price: filters.maxPrice,
    p_pricing: filters.pricing,
    p_availability: filters.availability,
    p_recent_days: filters.recent,
    p_sort: filters.sort,
    p_limit: pageSize,
    p_offset: (filters.page - 1) * pageSize,
  });
  if (error) throw new ServiceQueryError();
  const items = data.map((row): ServiceCardData => ({
    id: row.id,
    title: row.title,
    description: row.description,
    citySlug: row.city,
    district: row.district,
    price: row.price,
    pricingType: row.pricing_type,
    availability: row.availability,
    category: { slug: row.category_slug, name: row.category_name },
    provider: {
      id: row.provider_id,
      username: row.provider_username,
      displayName: row.provider_display_name,
      avatarPath: row.provider_avatar_path,
      verified: row.provider_verified,
    },
    imageUrl: row.cover_path ? serviceImageUrl(row.cover_path) : null,
    featured: row.featured_at !== null,
    publishedAt: row.published_at,
  }));
  return { items, total: Number(data[0]?.total_count ?? 0), pageSize };
}

/** Services publiés récemment. */
export async function getRecentServices(limit = 8): Promise<ServiceCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("services")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .is("removed_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new ServiceQueryError();
  return toCards(data);
}

/** Services mis en avant par l'équipe (sélection éditoriale, sans paiement). */
export async function getFeaturedServices(limit = 8): Promise<ServiceCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("services")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .is("removed_at", null)
    .not("featured_at", "is", null)
    .order("featured_at", { ascending: false })
    .limit(limit);
  if (error) throw new ServiceQueryError();
  return toCards(data);
}

/** Fiche complète d'un service visible par l'utilisateur (RLS). */
export const getServiceDetail = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !UUID.test(id)) return null;
  const { data, error } = await supabase
    .from("services")
    .select(
      `id, provider_id, category_id, title, description, city, district, price, pricing_type, availability,
       availability_note, extra_info, contact_phone, whatsapp, status, featured_at, removed_at,
       removed_reason, published_at, updated_at,
       category:service_categories(slug, name),
       provider:profiles!services_provider_id_fkey(id, username, display_name, avatar_path, bio, city, created_at, verified_at),
       images:service_images(id, storage_path, sort_order)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ServiceQueryError();
  if (!data || !data.category) return null;
  const images = [...data.images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      path: image.storage_path,
      url: serviceImageUrl(image.storage_path),
    }));
  return { ...data, category: data.category, images };
});

export type ServiceDetail = NonNullable<Awaited<ReturnType<typeof getServiceDetail>>>;

/** Autres services publics d'un prestataire. */
export async function getProviderServices(
  providerId: string,
  { excludeId, limit = 12 }: { excludeId?: string; limit?: number } = {},
): Promise<ServiceCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase
    .from("services")
    .select(CARD_COLUMNS)
    .eq("provider_id", providerId)
    .eq("status", "active")
    .is("removed_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new ServiceQueryError();
  return toCards(data);
}

/** Services de la même catégorie (suggestions sous la fiche d'un service). */
export async function getSimilarServices(
  service: { id: string; providerId: string; categoryId: string; city: string },
  limit = 6,
): Promise<ServiceCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("services")
    .select(CARD_COLUMNS)
    .eq("category_id", service.categoryId)
    .eq("status", "active")
    .is("removed_at", null)
    .neq("id", service.id)
    .neq("provider_id", service.providerId)
    .order("published_at", { ascending: false })
    .limit(limit * 2);
  if (error) throw new ServiceQueryError();
  // Les prestataires de la même ville d'abord.
  return toCards(data)
    .sort((a, b) => Number(b.citySlug === service.city) - Number(a.citySlug === service.city))
    .slice(0, limit);
}

/** Tous les services de l'utilisateur connecté, avec vues et demandes reçues. */
export async function getMyServices(userId: string): Promise<OwnServiceData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const [services, stats] = await Promise.all([
    supabase
      .from("services")
      .select(`${CARD_COLUMNS}, status, removed_at, removed_reason`)
      .eq("provider_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("get_my_service_stats"),
  ]);
  if (services.error) throw new ServiceQueryError();
  const statsById = new Map((stats.data ?? []).map((row) => [row.service_id, row]));
  return services.data.flatMap((row) => {
    const card = toServiceCard(row);
    if (!card) return [];
    const stat = statsById.get(row.id);
    return [
      {
        ...card,
        status: row.status,
        removedAt: row.removed_at,
        removedReason: row.removed_reason,
        views: Number(stat?.views ?? 0),
        requests: Number(stat?.requests ?? 0),
      },
    ];
  });
}

/** Identifiants des services enregistrés par l'utilisateur parmi ceux affichés. */
export async function getServiceFavoriteIds(
  userId: string | null,
  serviceIds: string[],
): Promise<Set<string>> {
  if (!userId || serviceIds.length === 0) return new Set();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new Set();
  const { data } = await supabase
    .from("service_favorites")
    .select("service_id")
    .eq("user_id", userId)
    .in("service_id", serviceIds);
  return new Set((data ?? []).map((row) => row.service_id));
}

/** Services enregistrés par l'utilisateur (les plus récents d'abord). */
export async function getFavoriteServices(userId: string, limit = 60): Promise<ServiceCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("service_favorites")
    .select(`created_at, service:services(${CARD_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new ServiceQueryError();
  return toCards(data.flatMap((row) => (row.service ? [row.service] : [])));
}

/** Compte la vue d'un membre connecté (au plus une par membre et par service). */
export async function recordServiceView(serviceId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase.rpc("record_service_view", { p_service_id: serviceId });
}
