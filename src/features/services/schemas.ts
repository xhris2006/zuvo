import { z } from "zod";
import { CITY_SLUG_PATTERN } from "@/features/locations/names";
import { normalizePhone } from "@/features/profiles/phone";
import { vm } from "@/lib/forms/validation";
import { serviceAvailabilities, serviceLimits, servicePricingTypes } from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, vm("maxChars", max))
    .transform((value) => value || null);

/** Prix saisi en FCFA : chiffres uniquement (espaces tolérés), entier positif. */
const priceSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const digits = value.replace(/[\s  .]/g, "");
    if (!digits) return null;
    if (!/^\d+$/.test(digits)) {
      context.addIssue({ code: "custom", message: vm("priceDigits") });
      return z.NEVER;
    }
    const price = Number(digits);
    if (price > serviceLimits.priceMax) {
      context.addIssue({ code: "custom", message: vm("priceTooHigh") });
      return z.NEVER;
    }
    return price;
  });

/** Numéro public du service : facultatif, normalisé au format international. */
const contactPhoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    if (!value) return null;
    const normalized = normalizePhone(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: vm("phoneInvalid") });
      return z.NEVER;
    }
    return normalized;
  });

/** Champs d'un service, tels que saisis dans le formulaire de publication. */
export const serviceFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(serviceLimits.titleMin, vm("minChars", serviceLimits.titleMin))
      .max(serviceLimits.titleMax, vm("maxChars", serviceLimits.titleMax)),
    category: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{1,60}$/, vm("categoryRequired")),
    description: z
      .string()
      .trim()
      .min(serviceLimits.descriptionMin, vm("serviceDescriptionMin", serviceLimits.descriptionMin))
      .max(serviceLimits.descriptionMax, vm("maxChars", serviceLimits.descriptionMax)),
    // Format seulement : la ville doit en plus être proposée (vérifié par l'action serveur).
    city: z.string().trim().regex(CITY_SLUG_PATTERN, vm("cityRequired")),
    district: optionalText(serviceLimits.districtMax),
    pricingType: z.enum(servicePricingTypes, { error: vm("pricingInvalid") }),
    price: priceSchema,
    availability: z.enum(serviceAvailabilities, { error: vm("availabilityInvalid") }),
    availabilityNote: optionalText(serviceLimits.availabilityNoteMax),
    extraInfo: optionalText(serviceLimits.extraInfoMax),
    contactPhone: contactPhoneSchema,
    whatsapp: z.boolean(),
  })
  // « Sur devis » : pas de prix ; sinon le prix est obligatoire.
  .transform((fields, context) => {
    if (fields.pricingType !== "quote" && fields.price === null) {
      context.addIssue({ code: "custom", path: ["price"], message: vm("servicePriceRequired") });
      return z.NEVER;
    }
    return {
      ...fields,
      price: fields.pricingType === "quote" ? null : fields.price,
      whatsapp: fields.whatsapp && fields.contactPhone !== null,
    };
  });

export type ServiceFields = z.output<typeof serviceFieldsSchema>;
export type ServiceField = keyof ServiceFields;

/** Description des photos souhaitées, dans l'ordre (la première est la principale). */
export const serviceImagesSchema = z
  .array(
    z.union([
      z.object({ id: z.uuid() }).strict(),
      z
        .object({
          path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/),
        })
        .strict(),
    ]),
  )
  .max(serviceLimits.maxImages);

export type ServiceImageInput = z.infer<typeof serviceImagesSchema>[number];

/** Statuts qu'un prestataire peut choisir. */
export const providerStatusSchema = z.enum(["active", "paused"]);

// -----------------------------------------------------------------------------
// Recherche
// -----------------------------------------------------------------------------
export const serviceSortOptions = ["recent", "price_asc", "price_desc"] as const;
export type ServiceSort = (typeof serviceSortOptions)[number];
export const serviceRecentOptions = [7, 30] as const;

export type ServiceSearchFilters = {
  q?: string;
  category?: string;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  pricing?: (typeof servicePricingTypes)[number];
  availability?: (typeof serviceAvailabilities)[number];
  recent?: (typeof serviceRecentOptions)[number];
  sort: ServiceSort;
  page: number;
};

/** Noms des paramètres d'URL (en français, comme le reste du site). */
const paramNames = {
  q: "q",
  category: "categorie",
  city: "ville",
  district: "quartier",
  minPrice: "min",
  maxPrice: "max",
  pricing: "tarif",
  availability: "dispo",
  recent: "recent",
  sort: "tri",
  page: "page",
} as const satisfies Record<keyof ServiceSearchFilters, string>;

type RawParams = Record<string, string | string[] | undefined>;

function single(params: RawParams, key: string): string | undefined {
  const value = params[key];
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

function positiveInteger(value: string | undefined, max: number): number | undefined {
  if (!value || !/^\d{1,9}$/.test(value)) return undefined;
  const number = Number(value);
  return number <= max ? number : undefined;
}

function oneOf<T extends string | number>(value: unknown, options: readonly T[]): T | undefined {
  return options.find((option) => String(option) === value);
}

/** Lit les filtres d'une URL de recherche ; toute valeur invalide est ignorée. */
export function parseServiceSearchParams(params: RawParams): ServiceSearchFilters {
  const q = single(params, paramNames.q)
    ?.replace(/[%_\\]/g, " ")
    .slice(0, 100)
    .trim();
  const district = single(params, paramNames.district)
    ?.replace(/[%_\\]/g, " ")
    .slice(0, serviceLimits.districtMax)
    .trim();
  const category = single(params, paramNames.category);
  const city = single(params, paramNames.city);
  let minPrice = positiveInteger(single(params, paramNames.minPrice), serviceLimits.priceMax);
  let maxPrice = positiveInteger(single(params, paramNames.maxPrice), serviceLimits.priceMax);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return {
    q: q || undefined,
    category: category && /^[a-z0-9-]{1,60}$/.test(category) ? category : undefined,
    city: city && CITY_SLUG_PATTERN.test(city) ? city : undefined,
    district: district || undefined,
    minPrice,
    maxPrice,
    pricing: oneOf(single(params, paramNames.pricing), servicePricingTypes),
    availability: oneOf(single(params, paramNames.availability), serviceAvailabilities),
    recent: oneOf(single(params, paramNames.recent), serviceRecentOptions),
    sort: oneOf(single(params, paramNames.sort), serviceSortOptions) ?? "recent",
    page: positiveInteger(single(params, paramNames.page), 1000) || 1,
  };
}

/** Paramètres d'URL des filtres (valeurs par défaut omises). */
export function serviceSearchParams(filters: Partial<ServiceSearchFilters>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(paramNames) as Array<keyof ServiceSearchFilters>) {
    const value = filters[key];
    if (value === undefined || value === "") continue;
    if (key === "sort" && value === "recent") continue;
    if (key === "page" && value === 1) continue;
    params.set(paramNames[key], String(value));
  }
  return params;
}

/** Nombre de filtres actifs (hors texte, tri et pagination). */
export function countServiceFilters(filters: ServiceSearchFilters): number {
  return [
    filters.category,
    filters.city,
    filters.district,
    filters.minPrice,
    filters.maxPrice,
    filters.pricing,
    filters.availability,
    filters.recent,
  ].filter((value) => value !== undefined).length;
}
