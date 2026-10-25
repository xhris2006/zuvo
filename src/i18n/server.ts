import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, type Locale, parseLocale } from "./config";
import { getServerDictionary, type ServerDictionary } from "./server-dictionaries";

/** Langue de la requête en cours (cookie de l'appareil), français par défaut. */
export const getLocale = cache(async (): Promise<Locale> => {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
});

/** Dictionnaire complet (partagé et serveur) de la langue de la requête. */
export async function getT(): Promise<ServerDictionary> {
  return getServerDictionary(await getLocale());
}
