/**
 * Configuration centrale du produit. Le nom, le pays, la devise et la langue
 * par défaut sont définis ici et nulle part ailleurs.
 */
export const siteConfig = {
  name: "MboaDeal",
  /** Les deux parties du nom, mises en forme séparément (« Deal » en orange). */
  brand: { first: "Mboa", second: "Deal" },
  tagline: "Achète. Vends. Donne une seconde vie.",
  description:
    "Découvre des annonces et de bonnes affaires au Cameroun. Achète et vends des articles simplement sur MboaDeal.",
  country: { code: "CM", name: "Cameroun" },
  currency: "XAF",
  /** Locale utilisée pour formater les prix et les dates. */
  intlLocale: "fr-CM",
  timeZone: "Africa/Douala",
  defaultLocale: "fr",
  /** Orange de marque (barre du navigateur, application installée). */
  themeColor: "#ff7a00",
  /** Fond de l'écran de démarrage de l'application installée. */
  backgroundColor: "#f8f7f3",
  /** Assistance téléphonique (format international, sans espaces). */
  supportPhone: "+237694600007",
} as const;

/** Numéro lisible : « +237 6 94 60 00 07 ». */
export function formatSupportPhone(phone: string = siteConfig.supportPhone): string {
  const match = /^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone);
  return match ? `+237 ${match.slice(1).join(" ")}` : phone;
}

export type SiteConfig = typeof siteConfig;
