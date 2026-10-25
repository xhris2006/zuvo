import { siteConfig } from "@/config/site";

/** Langues de l'interface. Le français reste la langue par défaut. */
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = siteConfig.defaultLocale;

/** Langue choisie sur l'appareil (Paramètres → Langue), lue côté serveur. */
export const LOCALE_COOKIE = "zuvo-locale";

/** Un an : la préférence de langue n'a rien de sensible. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Toute valeur inconnue ou absente retombe sur la langue par défaut. */
export function parseLocale(value: unknown): Locale {
  return locales.find((locale) => locale === value) ?? defaultLocale;
}

/** Locale Intl (prix, dates) de chaque langue. */
export const intlLocales: Record<Locale, string> = { fr: "fr-CM", en: "en-CM" };

/** Nom de chaque langue, écrit dans cette langue. */
export const localeNames: Record<Locale, string> = { fr: "Français", en: "English" };
