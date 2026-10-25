import { z } from "zod";
import { listingLimits } from "@/config/limits";
import { CITY_SLUG_PATTERN } from "@/features/locations/names";
import { listingConditions } from "./constants";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);

/** Prix saisi en FCFA : chiffres uniquement (espaces tolérés), entier positif. */
const priceSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const digits = value.replace(/[\s  .]/g, "");
    if (!digits) return null;
    if (!/^\d+$/.test(digits)) {
      context.addIssue({ code: "custom", message: "Indiquez un prix en chiffres, sans centimes." });
      return z.NEVER;
    }
    const price = Number(digits);
    if (price > listingLimits.priceMax) {
      context.addIssue({ code: "custom", message: "Prix trop élevé." });
      return z.NEVER;
    }
    return price;
  });

/** Champs d'une annonce, tels que saisis (un brouillon peut être incomplet). */
export const listingFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(listingLimits.titleMin, `Au moins ${listingLimits.titleMin} caractères.`)
    .max(listingLimits.titleMax, `${listingLimits.titleMax} caractères au maximum.`),
  description: z
    .string()
    .trim()
    .max(listingLimits.descriptionMax, `${listingLimits.descriptionMax} caractères au maximum.`),
  category: optionalText.pipe(
    z
      .string()
      .regex(/^[a-z0-9-]{1,60}$/, "Catégorie invalide.")
      .nullable(),
  ),
  condition: optionalText.pipe(z.enum(listingConditions, { error: "État invalide." }).nullable()),
  price: priceSchema,
  // Format seulement : la ville doit en plus être proposée (vérifié par l'action serveur).
  city: optionalText.pipe(z.string().regex(CITY_SLUG_PATTERN, "Ville invalide.").nullable()),
});

export type ListingFields = z.infer<typeof listingFieldsSchema>;
export type ListingField = keyof ListingFields;

/** Erreurs empêchant la publication (champs manquants). */
export function publicationErrors(fields: ListingFields): Partial<Record<ListingField, string>> {
  const errors: Partial<Record<ListingField, string>> = {};
  if (fields.description.length < listingLimits.descriptionMin) {
    errors.description = `Décrivez l'article en au moins ${listingLimits.descriptionMin} caractères.`;
  }
  if (!fields.category) errors.category = "Choisissez une catégorie.";
  if (!fields.condition) errors.condition = "Indiquez l'état de l'article.";
  if (fields.price === null) errors.price = "Indiquez un prix.";
  if (!fields.city) errors.city = "Indiquez la ville.";
  return errors;
}

/** Statuts qu'un vendeur peut choisir pour une annonce publiée. */
export const sellerStatusSchema = z.enum(["active", "reserved", "sold", "withdrawn"]);

/** Description des photos souhaitées, dans l'ordre (la première est la principale). */
export const listingImagesSchema = z
  .array(
    z.union([
      z.object({ id: z.uuid() }).strict(),
      z
        .object({
          path: z
            .string()
            .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/),
        })
        .strict(),
    ]),
  )
  .max(listingLimits.maxImages);

export type ListingImageInput = z.infer<typeof listingImagesSchema>[number];
