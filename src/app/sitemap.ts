import type { MetadataRoute } from "next";
import { publicProfileHref, routes } from "@/config/routes";
import { listingImageUrl } from "@/features/listings/image-url";
import { listingHref } from "@/features/listings/links";
import { getSiteUrl } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Régénéré au plus une fois par heure. */
export const revalidate = 3600;

const MAX_LISTINGS = 5000;

const staticPages = [
  { path: routes.home, priority: 1, changeFrequency: "daily" },
  { path: routes.explore, priority: 0.9, changeFrequency: "hourly" },
  { path: routes.safety, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.help, priority: 0.4, changeFrequency: "monthly" },
  { path: routes.reportsInfo, priority: 0.3, changeFrequency: "monthly" },
  { path: routes.terms, priority: 0.2, changeFrequency: "yearly" },
  { path: routes.privacy, priority: 0.2, changeFrequency: "yearly" },
] as const;

/** Annonces en vente (visibles des visiteurs) et profils de leurs vendeurs. */
async function listingEntries(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, updated_at, seller:profiles!listings_seller_id_fkey(username), images:listing_images(storage_path, sort_order)",
    )
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .limit(MAX_LISTINGS);
  if (error || !data) return [];

  const sellers = new Map<string, string>();
  const listings = data.map((row) => {
    if (row.seller && !sellers.has(row.seller.username)) {
      sellers.set(row.seller.username, row.updated_at);
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
  const profiles = [...sellers].map(([username, lastModified]) => ({
    url: `${siteUrl}${publicProfileHref(username)}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
  return [...listings, ...profiles];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const pages = staticPages.map((page) => ({
    url: `${siteUrl}${page.path === "/" ? "" : page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
  return [...pages, ...(await listingEntries(siteUrl).catch(() => []))];
}
