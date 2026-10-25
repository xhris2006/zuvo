import { en } from "./dictionaries/en";
import { type Dictionary, fr } from "./dictionaries/fr";
import type { Locale } from "./config";

export * from "./config";

const dictionaries: Record<Locale, Dictionary> = { fr, en };

/**
 * Dictionnaire partagé (serveur et navigateur) d'une langue. Côté serveur,
 * utiliser `getT()` (`@/i18n/server`) ; côté client, `useT()` (`@/i18n/client`).
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
