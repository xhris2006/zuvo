import type { MetadataRoute } from "next";
import { exploreHref, publicProfileHref, routes } from "@/config/routes";
import { legalUpdatedAt } from "@/config/legal";
import { listingImageUrl } from "@/features/listings/image-url";
import { listingHref } from "@/features/listings/links";
import { toSearchParams } from "@/features/search/schema";
import { serviceImageUrl } from "@/features/services/image-url";
import { serviceHref, serviceSearchHref } from "@/features/services/links";
import { serviceSearchParams } from "@/features/services/schemas";
import { getSiteUrl } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Régénéré au plus une fois par heure. */
export const revalidate = 3600;

const MAX_LISTINGS = 5000;
const MAX_SERVICES = 5000;

type StaticPage = {
  path: string;
  priority: number;
  changeFrequency: "hourly" | "daily" | "monthly" | "yearly";
  lastModified?: string;
};

/** Pages publiques indexables, à leur URL canonique (« /bienvenue » pointe vers « / »). */
const staticPages: StaticPage[] = [
  { path: routes.home, priority: 1, changeFrequency: "daily" },
  { path: routes.explore, priority: 0.9, changeFrequency: "hourly" },
  { path: routes.services, priority: 0.9, changeFrequency: "daily" },
  { path: routes.servicesSearch, priority: 0.7, changeFrequency: "daily" },
  { path: routes.safety, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.help, priority: 0.4, changeFrequency: "monthly" },
  { path: routes.install, priority: 0.3, changeFrequency: "monthly" },
  {
    path: routes.reportsInfo,
    priority: 0.3,
    changeFrequency: "monthly",
    lastModified: legalUpdatedAt.reports,
  },
  {
    path: routes.terms,
    priority: 0.3,
    changeFrequency: "yearly",
    lastModified: legalUpdatedAt.terms,
  },
  {
    path: routes.privacy,
    priority: 0.3,
    changeFrequency: "yearly",
    lastModified: legalUpdatedAt.privacy,
  },
];

/**
 * Annonces en vente (visibles des visiteurs), profils de leurs vendeurs et
 * catégories qui contiennent au moins une annonce en vente (une catégorie vide
 * n'apporterait qu'une page sans contenu).
 */
async function listingEntries(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, updated_at, category:categories(slug, is_active), seller:profiles!listings_seller_id_fkey(username), images:listing_images(storage_path, sort_order)",
    )
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .limit(MAX_LISTINGS);
  if (error || !data) return [];

  const sellers = new Map<string, string>();
  const categories = new Map<string, string>();
  const listings = data.map((row) => {
    if (row.seller && !sellers.has(row.seller.username)) {
      sellers.set(row.seller.username, row.updated_at);
    }
    if (row.category?.is_active && !categories.has(row.category.slug)) {
      categories.set(row.category.slug, row.updated_at);
    }
    const cover = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const image = cover ? listingImageUrl(cover.storage_path) : null;
    return {
      url: `${siteUrl}${listingHref(row.id)}`,
      lastModified: row.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.7,
      images: image ? [image] : undefined,
    };
  });
  const categoryPages = [...categories].map(([slug, lastModified]) => ({
    url: `${siteUrl}${exploreHref(toSearchParams({ category: slug }))}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
  const profiles = [...sellers].map(([username, lastModified]) => ({
    url: `${siteUrl}${publicProfileHref(username)}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
  return [...categoryPages, ...listings, ...profiles];
}

/**
 * Services en ligne (visibles des visiteurs) et catégories de services qui en
 * contiennent au moins un ; les profils des prestataires sont ajoutés s'ils ne
 * figurent pas déjà parmi les vendeurs.
 */
async function serviceEntries(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, updated_at, category:service_categories(slug, is_active), provider:profiles!services_provider_id_fkey(username), images:service_images(storage_path, sort_order)",
    )
    .eq("status", "active")
    .is("removed_at", null)
    .order("published_at", { ascending: false })
    .limit(MAX_SERVICES);
  if (error || !data) return [];

  const providers = new Map<string, string>();
  const categories = new Map<string, string>();
  const services = data.flatMap((row) => {
    // Prestataire ou catégorie invisibles : la fiche n'est pas publique.
    if (!row.provider || !row.category) return [];
    if (!providers.has(row.provider.username)) {
      providers.set(row.provider.username, row.updated_at);
    }
    if (row.category.is_active && !categories.has(row.category.slug)) {
      categories.set(row.category.slug, row.updated_at);
    }
    const cover = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const image = cover ? serviceImageUrl(cover.storage_path) : null;
    return [
      {
        url: `${siteUrl}${serviceHref(row.id)}`,
        lastModified: row.updated_at,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: image ? [image] : undefined,
      },
    ];
  });
  const categoryPages = [...categories].map(([slug, lastModified]) => ({
    url: `${siteUrl}${serviceSearchHref(serviceSearchParams({ category: slug }))}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
  const profiles = [...providers].map(([username, lastModified]) => ({
    url: `${siteUrl}${publicProfileHref(username)}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
  return [...categoryPages, ...services, ...profiles];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const pages = staticPages.map((page) => ({
    url: `${siteUrl}${page.path === routes.home ? "/" : page.path}`,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
  const [listings, services] = await Promise.all([
    listingEntries(siteUrl).catch(() => []),
    serviceEntries(siteUrl).catch(() => []),
  ]);
  // Une URL ne figure qu'une fois (profil à la fois vendeur et prestataire).
  const seen = new Set<string>();
  return [...pages, ...listings, ...services].filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
