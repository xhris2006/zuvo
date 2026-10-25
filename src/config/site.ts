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
  themeColor: "#1f5fe0",
  /** Assistance téléphonique (format international, sans espaces). */
  supportPhone: "+237694600007",
} as const;

/** Numéro lisible : « +237 6 94 60 00 07 ». */
export function formatSupportPhone(phone: string = siteConfig.supportPhone): string {
  const match = /^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone);
  return match ? `+237 ${match.slice(1).join(" ")}` : phone;
}

export type SiteConfig = typeof siteConfig;
