export type City = {
  /** Identifiant stable stocké en base de données. */
  slug: string;
  name: string;
  region: string;
};

/**
 * Villes proposées au Cameroun : les dix chefs-lieux de région et les
 * principales villes. La liste peut être complétée sans migration.
 */
export const cities = [
  { slug: "douala", name: "Douala", region: "Littoral" },
  { slug: "yaounde", name: "Yaoundé", region: "Centre" },
  { slug: "bafoussam", name: "Bafoussam", region: "Ouest" },
  { slug: "bamenda", name: "Bamenda", region: "Nord-Ouest" },
  { slug: "garoua", name: "Garoua", region: "Nord" },
  { slug: "maroua", name: "Maroua", region: "Extrême-Nord" },
  { slug: "ngaoundere", name: "Ngaoundéré", region: "Adamaoua" },
  { slug: "bertoua", name: "Bertoua", region: "Est" },
  { slug: "ebolowa", name: "Ebolowa", region: "Sud" },
  { slug: "buea", name: "Buea", region: "Sud-Ouest" },
  { slug: "limbe", name: "Limbé", region: "Sud-Ouest" },
  { slug: "kumba", name: "Kumba", region: "Sud-Ouest" },
  { slug: "kribi", name: "Kribi", region: "Sud" },
  { slug: "edea", name: "Édéa", region: "Littoral" },
  { slug: "nkongsamba", name: "Nkongsamba", region: "Littoral" },
  { slug: "dschang", name: "Dschang", region: "Ouest" },
  { slug: "foumban", name: "Foumban", region: "Ouest" },
  { slug: "mbouda", name: "Mbouda", region: "Ouest" },
  { slug: "bafang", name: "Bafang", region: "Ouest" },
  { slug: "mbalmayo", name: "Mbalmayo", region: "Centre" },
  { slug: "sangmelima", name: "Sangmélima", region: "Sud" },
  { slug: "kousseri", name: "Kousséri", region: "Extrême-Nord" },
] as const satisfies readonly City[];

export type CitySlug = (typeof cities)[number]["slug"];

export const citySlugs = cities.map((city) => city.slug) as [CitySlug, ...CitySlug[]];

export function getCity(slug: string): City | undefined {
  return cities.find((city) => city.slug === slug);
}
