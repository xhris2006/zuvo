import { z } from "zod";
import { listingLimits, searchLimits } from "@/config/limits";
import { citySlugs } from "@/config/locations";
import { listingConditions } from "@/features/listings/constants";

export const sortOptions = ["newest", "price_asc", "price_desc"] as const;
export type SortOption = (typeof sortOptions)[number];

const MAX_PAGE = 500;

const price = z.coerce.number().int().min(0).max(listingLimits.priceMax);

/**
 * Chaque champ est validé indépendamment : une valeur invalide dans l'URL
 * est ignorée au lieu de faire échouer toute la recherche.
 */
const searchFiltersSchema = z.object({
  q: z
    .string()
    .trim()
    .max(searchLimits.queryMax)
    .transform((value) => value || undefined)
    .optional()
    .catch(undefined),
  category: z
    .string()
    .regex(/^[a-z0-9-]{1,60}$/)
    .optional()
    .catch(undefined),
  city: z.enum(citySlugs).optional().catch(undefined),
  condition: z.enum(listingConditions).optional().catch(undefined),
  minPrice: price.optional().catch(undefined),
  maxPrice: price.optional().catch(undefined),
  sort: z.enum(sortOptions).catch("newest"),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

const filterKeys = Object.keys(searchFiltersSchema.shape) as Array<keyof SearchFilters>;

export function parseSearchParams(raw: RawSearchParams): SearchFilters {
  const firstValues: Record<string, string | undefined> = {};
  for (const key of filterKeys) {
    const value = raw[key];
    const first = Array.isArray(value) ? value[0] : value;
    // Un champ de formulaire vide est équivalent à un champ absent.
    firstValues[key] = first === "" ? undefined : first;
  }

  const filters = searchFiltersSchema.parse(firstValues);

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    return { ...filters, minPrice: filters.maxPrice, maxPrice: filters.minPrice };
  }
  return filters;
}

/** Sérialise les filtres en query string en omettant les valeurs par défaut. */
export function toSearchParams(filters: Partial<SearchFilters>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of filterKeys) {
    const value = filters[key];
    if (value === undefined) continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "page" && value === 1) continue;
    params.set(key, String(value));
  }
  return params;
}

/** Nombre de filtres actifs (hors tri et pagination). */
export function countActiveFilters(filters: SearchFilters): number {
  return [
    filters.q,
    filters.category,
    filters.city,
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
  ].filter((value) => value !== undefined).length;
}
