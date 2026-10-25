import { z } from "zod";
import { vm } from "@/lib/forms/validation";
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
      context.addIssue({ code: "custom", message: vm("priceDigits") });
      return z.NEVER;
    }
    const price = Number(digits);
    if (price > listingLimits.priceMax) {
      context.addIssue({ code: "custom", message: vm("priceTooHigh") });
      return z.NEVER;
    }
    return price;
  });

/** Champs d'une annonce, tels que saisis (un brouillon peut être incomplet). */
export const listingFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(listingLimits.titleMin, vm("minChars", listingLimits.titleMin))
    .max(listingLimits.titleMax, vm("maxChars", listingLimits.titleMax)),
  description: z
    .string()
    .trim()
    .max(listingLimits.descriptionMax, vm("maxChars", listingLimits.descriptionMax)),
  category: optionalText.pipe(
    z
      .string()
      .regex(/^[a-z0-9-]{1,60}$/, vm("categoryInvalid"))
      .nullable(),
  ),
  condition: optionalText.pipe(
    z.enum(listingConditions, { error: vm("conditionInvalid") }).nullable(),
  ),
  price: priceSchema,
  // Format seulement : la ville doit en plus être proposée (vérifié par l'action serveur).
  city: optionalText.pipe(z.string().regex(CITY_SLUG_PATTERN, vm("cityInvalid")).nullable()),
});

export type ListingFields = z.infer<typeof listingFieldsSchema>;
export type ListingField = keyof ListingFields;

/** Erreurs empêchant la publication (champs manquants), sous forme de codes `vm`. */
export function publicationErrors(fields: ListingFields): Partial<Record<ListingField, string>> {
  const errors: Partial<Record<ListingField, string>> = {};
  if (fields.description.length < listingLimits.descriptionMin) {
    errors.description = vm("descriptionMin", listingLimits.descriptionMin);
  }
  if (!fields.category) errors.category = vm("categoryRequired");
  if (!fields.condition) errors.condition = vm("conditionRequired");
  if (fields.price === null) errors.price = vm("priceRequired");
  if (!fields.city) errors.city = vm("cityRequired");
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
