/**
 * Configuration centrale du produit. Le nom, le pays, la devise et la langue
 * par défaut sont définis ici et nulle part ailleurs.
 */
export const siteConfig = {
  name: "Zuvo",
  tagline: "La seconde main, simplement.",
  description:
    "Vendez et achetez gratuitement vêtements, chaussures, accessoires, électronique et bien plus, entre particuliers au Cameroun. Sans commission.",
  country: { code: "CM", name: "Cameroun" },
  currency: "XAF",
  /** Locale utilisée pour formater les prix et les dates. */
  intlLocale: "fr-CM",
  timeZone: "Africa/Douala",
  defaultLocale: "fr",
  themeColor: "#53684b",
} as const;

export type SiteConfig = typeof siteConfig;
