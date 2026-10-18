import { siteConfig } from "@/config/site";
import { fr, type Dictionary } from "./dictionaries/fr";

export const locales = ["fr"] as const;
export type Locale = (typeof locales)[number];

const dictionaries: Record<Locale, Dictionary> = { fr };

/**
 * Retourne le dictionnaire de la langue demandée. Pour ajouter l'anglais :
 * créer `dictionaries/en.ts` typé `Dictionary`, l'ajouter à `locales` et
 * à `dictionaries`, puis déterminer la langue (cookie ou préfixe d'URL).
 */
export function getDictionary(locale: Locale = siteConfig.defaultLocale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
