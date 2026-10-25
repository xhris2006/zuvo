import "server-only";
import { cache } from "react";
import { type City, cities as defaultCities } from "@/config/locations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cityNameFrom } from "./names";

/**
 * Villes proposées (table `cities`, ordre défini par l'administration). Repli
 * sur la liste initiale de src/config/locations.ts si la base n'est pas
 * configurée, injoignable ou si la table est vide.
 */
export const getCities = cache(async (): Promise<City[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [...defaultCities];
  const { data, error } = await supabase
    .from("cities")
    .select("slug, name, region")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error || !Array.isArray(data) || data.length === 0) return [...defaultCities];
  return data;
});

/** Noms de toutes les villes connues (y compris désactivées, pour l'affichage). */
export const getCityNames = cache(async (): Promise<ReadonlyMap<string, string>> => {
  const names = new Map<string, string>(defaultCities.map((city) => [city.slug, city.name]));
  for (const city of await getCities()) names.set(city.slug, city.name);
  return names;
});

/** Nom affiché d'une ville à partir de son identifiant (null si absent). */
export async function cityName(slug: string | null | undefined): Promise<string | null> {
  return cityNameFrom(slug, await getCityNames());
}

/** La ville fait-elle partie des villes proposées actuellement ? */
export async function isAvailableCity(slug: string): Promise<boolean> {
  return (await getCities()).some((city) => city.slug === slug);
}
