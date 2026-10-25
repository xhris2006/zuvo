import "server-only";
import type { Locale } from "./config";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { enServer } from "./dictionaries/server/en";
import { frServer } from "./dictionaries/server/fr";

/**
 * Le dictionnaire serveur complète le dictionnaire partagé avec les textes
 * qui n'ont pas à être envoyés au navigateur (pages, actions, administration).
 */
const serverDictionaries = {
  fr: { ...fr, ...frServer },
  en: { ...en, ...enServer },
};

export type ServerDictionary = (typeof serverDictionaries)["fr"];

export function getServerDictionary(locale: Locale): ServerDictionary {
  return serverDictionaries[locale];
}
