import { z } from "zod";
import { CITY_SLUG_PATTERN, slugify } from "@/features/locations/names";

/** Décalage horaire du Cameroun (UTC+1, sans heure d'été). */
const CAMEROON_OFFSET = "+01:00";

/**
 * Date et heure saisies dans un champ `datetime-local` (heure du Cameroun),
 * converties en date absolue. Chaîne vide : null. Valeur invalide : undefined.
 */
export function parseCameroonDateTime(value: string): Date | null | undefined {
  if (value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}:00${CAMEROON_OFFSET}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Valeur d'un champ `datetime-local` (heure du Cameroun) pour une date absolue. */
export function toCameroonDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

const name = z
  .string()
  .trim()
  .min(2, "Indiquez un nom d'au moins 2 caractères.")
  .max(60, "60 caractères au maximum.");

/** Identifiant facultatif : déduit du nom s'il est vide. */
function withSlug<T extends { name: string; slug: string }>(value: T, ctx: z.RefinementCtx) {
  const slug = value.slug || slugify(value.name);
  if (!CITY_SLUG_PATTERN.test(slug)) {
    ctx.addIssue({
      code: "custom",
      path: ["slug"],
      message: "Identifiant invalide : lettres minuscules, chiffres et tirets.",
    });
    return z.NEVER;
  }
  return { ...value, slug };
}

export const categoryFormSchema = z
  .object({ name, slug: z.string().trim().toLowerCase().max(60) })
  .transform(withSlug);

export const cityFormSchema = z
  .object({
    name,
    region: z.string().trim().max(60, "60 caractères au maximum."),
    slug: z.string().trim().toLowerCase().max(60),
  })
  .transform(withSlug);

export const announcementKinds = ["info", "maintenance"] as const;

export const announcementFormSchema = z
  .object({
    kind: z.enum(announcementKinds, { error: "Type de message invalide." }),
    message: z
      .string()
      .trim()
      .min(3, "Le message doit contenir au moins 3 caractères.")
      .max(300, "300 caractères au maximum."),
    linkUrl: z
      .string()
      .trim()
      .max(300)
      .refine((value) => value === "" || /^(\/([^/\\].*)?|https:\/\/\S+)$/.test(value), {
        message: "Lien invalide : une adresse du site (/aide) ou commençant par https://.",
      }),
    startsAt: z.string().transform((value, ctx) => {
      const date = parseCameroonDateTime(value);
      if (date === undefined) {
        ctx.addIssue({ code: "custom", message: "Date de début invalide." });
        return z.NEVER;
      }
      return date;
    }),
    endsAt: z.string().transform((value, ctx) => {
      const date = parseCameroonDateTime(value);
      if (date === undefined) {
        ctx.addIssue({ code: "custom", message: "Date de fin invalide." });
        return z.NEVER;
      }
      return date;
    }),
    isActive: z.boolean(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "La fin doit être postérieure au début.",
  });

/**
 * Mot interdit sous la forme stockée en base : minuscules sans accents,
 * lettres et chiffres séparés par une espace ou un tiret. null si invalide.
 */
export function normalizeBannedWord(value: string): string | null {
  const word = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 -]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ?- ?/g, "-")
    .trim();
  return /^[a-z0-9]+([ -][a-z0-9]+)*$/.test(word) && word.length >= 2 && word.length <= 40
    ? word
    : null;
}

export const antiSpamSettingsSchema = z.object({
  newAccountDays: z.coerce
    .number({ error: "Indiquez un nombre." })
    .int("Nombre entier attendu.")
    .min(0, "0 au minimum (0 : aucune limite).")
    .max(365, "365 au maximum."),
  newAccountDailyListings: z.coerce
    .number({ error: "Indiquez un nombre." })
    .int("Nombre entier attendu.")
    .min(1, "1 au minimum.")
    .max(100, "100 au maximum."),
});

export type AntiSpamField = "newAccountDays" | "newAccountDailyListings" | "word";

export type AnnouncementField = "kind" | "message" | "linkUrl" | "startsAt" | "endsAt";
export type ReferenceField = "name" | "slug" | "region";
