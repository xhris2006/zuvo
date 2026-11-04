import type { MetadataRoute } from "next";
import {
  exploreHref,
  guestOnlyRoutes,
  isProtectedPath,
  publicProfileHref,
  routes,
} from "@/config/routes";
import { legalUpdatedAt } from "@/config/legal";
import { listingImageUrl } from "@/features/listings/image-url";
import { listingHref } from "@/features/listings/links";
import { toSearchParams } from "@/features/search/schema";
import { serviceImageUrl } from "@/features/services/image-url";
import { serviceHref, serviceSearchHref } from "@/features/services/links";
import { serviceSearchParams } from "@/features/services/schemas";
import { getPublicSiteUrl } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Régénéré au plus une fois par heure. */
export const revalidate = 3600;

const MAX_LISTINGS = 5000;
const MAX_SERVICES = 5000;

type Entry = MetadataRoute.Sitemap[number];

/** Garde la date la plus récente (horodatages ISO 8601 renvoyés par la base). */
function newest(current: string | undefined, candidate: string | null | undefined) {
  if (!candidate) return current;
  if (!current) return candidate;
  return Date.parse(candidate) > Date.parse(current) ? candidate : current;
}

/** Dernière modification connue par URL (profils, catégories). */
class LatestByKey extends Map<string, string> {
  touch(key: string, date: string | null | undefined) {
    const value = newest(this.get(key), date);
    if (value) this.set(key, value);
  }
}

type Collected = {
  entries: Entry[];
  /** Profils publics (nom d'utilisateur → dernière modification du profil ou de son contenu). */
  profiles: LatestByKey;
  /** Élément en ligne le plus récemment modifié (date de la page qui les liste). */
  latest?: string;
};

const empty = (): Collected => ({ entries: [], profiles: new LatestByKey() });

/**
 * Annonces visibles des visiteurs (en vente ou réservées, non retirées) et
 * pages de catégorie d'Explorer contenant au moins une annonce en vente, à
 * leur URL canonique (`/explorer?category=…`, la seule indexée parmi les
 * combinaisons de filtres). Une annonce vendue reste consultable, mais
 * n'est plus proposée à l'exploration.
 */
async function collectListings(siteUrl: string): Promise<Collected> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return empty();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, status, updated_at, category:categories(slug, is_active), seller:profiles!listings_seller_id_fkey(username, updated_at), images:listing_images(storage_path, sort_order)",
    )
    .in("status", ["active", "reserved"])
    .is("removed_at", null)
    .order("published_at", { ascending: false })
    .limit(MAX_LISTINGS);
  if (error || !data) return empty();

  const result = empty();
  const categories = new LatestByKey();
  for (const row of data) {
    // Vendeur invisible (compte suspendu ou supprimé) : l'annonce n'est pas publique.
    if (!row.seller) continue;
    result.profiles.touch(row.seller.username, row.seller.updated_at);
    result.profiles.touch(row.seller.username, row.updated_at);
    if (row.status === "active") {
      result.latest = newest(result.latest, row.updated_at);
      if (row.category?.is_active) categories.touch(row.category.slug, row.updated_at);
    }
    const cover = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const image = cover ? listingImageUrl(cover.storage_path) : null;
    result.entries.push({
      url: `${siteUrl}${listingHref(row.id)}`,
      lastModified: row.updated_at,
      changeFrequency: "daily",
      priority: 0.7,
      images: image ? [image] : undefined,
    });
  }
  const categoryPages: Entry[] = [...categories].map(([slug, lastModified]) => ({
    url: `${siteUrl}${exploreHref(toSearchParams({ category: slug }))}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.6,
  }));
  result.entries = [...categoryPages, ...result.entries];
  return result;
}

/**
 * Services en ligne (ni en pause, ni retirés) et pages de catégorie de la
 * recherche de services, à leur URL canonique (`/services/recherche?categorie=…`).
 */
async function collectServices(siteUrl: string): Promise<Collected> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return empty();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, updated_at, category:service_categories(slug, is_active), provider:profiles!services_provider_id_fkey(username, updated_at), images:service_images(storage_path, sort_order)",
    )
    .eq("status", "active")
    .is("removed_at", null)
    .order("published_at", { ascending: false })
    .limit(MAX_SERVICES);
  if (error || !data) return empty();

  const result = empty();
  const categories = new LatestByKey();
  for (const row of data) {
    // Prestataire ou catégorie invisibles : la fiche n'est pas publique.
    if (!row.provider || !row.category) continue;
    result.profiles.touch(row.provider.username, row.provider.updated_at);
    result.profiles.touch(row.provider.username, row.updated_at);
    result.latest = newest(result.latest, row.updated_at);
    if (row.category.is_active) categories.touch(row.category.slug, row.updated_at);
    const cover = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const image = cover ? serviceImageUrl(cover.storage_path) : null;
    result.entries.push({
      url: `${siteUrl}${serviceHref(row.id)}`,
      lastModified: row.updated_at,
      changeFrequency: "weekly",
      priority: 0.7,
      images: image ? [image] : undefined,
    });
  }
  const categoryPages: Entry[] = [...categories].map(([slug, lastModified]) => ({
    url: `${siteUrl}${serviceSearchHref(serviceSearchParams({ category: slug }))}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.6,
  }));
  result.entries = [...categoryPages, ...result.entries];
  return result;
}

/** Horodatage au format W3C (UTC, millisecondes) ; une date seule reste telle quelle. */
function w3cDate(date: Entry["lastModified"]) {
  return typeof date === "string" && date.includes("T") ? new Date(date).toISOString() : date;
}

/** Une URL privée ou réservée aux visiteurs non connectés n'a pas sa place ici. */
function isIndexablePath(pathname: string) {
  return !isProtectedPath(pathname) && !(guestOnlyRoutes as readonly string[]).includes(pathname);
}

/**
 * Plan du site pour les moteurs de recherche : pages publiques à leur URL
 * canonique sur le domaine officiel, annonces, services et profils publics.
 * `lastmod` n'est indiquée que lorsqu'elle est connue avec exactitude : date
 * des documents juridiques, dernière modification d'une annonce, d'un service
 * ou d'un profil, ou de l'élément le plus récent d'une page de liste.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  const [listings, services] = await Promise.all([
    collectListings(siteUrl).catch(empty),
    collectServices(siteUrl).catch(empty),
  ]);

  const pages: Array<{ path: string } & Omit<Entry, "url">> = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    {
      path: routes.explore,
      priority: 0.9,
      changeFrequency: "hourly",
      lastModified: listings.latest,
    },
    {
      path: routes.services,
      priority: 0.9,
      changeFrequency: "daily",
      lastModified: services.latest,
    },
    {
      path: routes.servicesSearch,
      priority: 0.7,
      changeFrequency: "daily",
      lastModified: services.latest,
    },
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

  // Profils des vendeurs et des prestataires, une seule fois chacun.
  const profiles = new LatestByKey();
  for (const source of [listings.profiles, services.profiles]) {
    for (const [username, date] of source) profiles.touch(username, date);
  }

  const entries: Entry[] = [
    ...pages.map(({ path, ...page }) => ({ url: `${siteUrl}${path}`, ...page })),
    ...listings.entries,
    ...services.entries,
    ...[...profiles].map(([username, lastModified]): Entry => ({
      url: `${siteUrl}${publicProfileHref(username)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    })),
  ];

  // Une URL ne figure qu'une fois, et jamais une page privée.
  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      if (seen.has(entry.url) || !isIndexablePath(new URL(entry.url).pathname)) return false;
      seen.add(entry.url);
      return true;
    })
    .map((entry) => ({ ...entry, lastModified: w3cDate(entry.lastModified) }));
}
