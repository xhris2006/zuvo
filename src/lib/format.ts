import { siteConfig } from "@/config/site";

/**
 * Intl sépare les milliers par une espace fine insécable (U+202F), absente de
 * certaines polices : on utilise une espace insécable classique (U+00A0).
 */
function withVisibleSpaces(value: string): string {
  return value.replace(/\u202f/g, "\u00a0");
}

const relativeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

function toDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date;
}

/**
 * Fonctions de formatage (prix en XAF, dates à l'heure du Cameroun, durées
 * relatives) pour une langue. Chaque dictionnaire en expose un jeu (`t.format`).
 *
 * @param intlLocale Locale Intl, par exemple « fr-CM » ou « en-CM ».
 * @param justNow Texte des durées inférieures à une minute.
 */
export function createFormatters(intlLocale: string, justNow: string) {
  const priceFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: siteConfig.currency,
    maximumFractionDigits: 0,
  });
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: siteConfig.timeZone,
  });
  const dayMonthFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: siteConfig.timeZone,
  });
  const relativeFormatter = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
  const monthYearFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: siteConfig.timeZone,
  });
  const compactFormatter = new Intl.NumberFormat(intlLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const numberFormatter = new Intl.NumberFormat(intlLocale);

  return {
    /** Montant entier en XAF, par exemple « 15 000 FCFA ». */
    price: (amount: number) => withVisibleSpaces(priceFormatter.format(amount)),
    /** « 18 octobre 2026 ». */
    date: (date: Date | string) => dateFormatter.format(toDate(date)),
    /** « 25 oct. » pour un jour calendaire au format AAAA-MM-JJ (sans décalage horaire). */
    dayMonth: (day: string) => dayMonthFormatter.format(new Date(`${day}T12:00:00Z`)),
    /** « 18 oct. 2026, 14:05 » (heure du Cameroun). */
    dateTime: (date: Date | string) => dateTimeFormatter.format(toDate(date)),
    /** « il y a 3 heures », « hier »… ; moins d'une minute : `justNow`. */
    relativeTime: (date: Date | string, now: Date = new Date()) => {
      const elapsedSeconds = Math.round((toDate(date).getTime() - now.getTime()) / 1000);
      for (const [unit, secondsInUnit] of relativeUnits) {
        if (Math.abs(elapsedSeconds) >= secondsInUnit) {
          return relativeFormatter.format(Math.round(elapsedSeconds / secondsInUnit), unit);
        }
      }
      return justNow;
    },
    /** « octobre 2026 ». */
    monthYear: (date: Date | string) => monthYearFormatter.format(toDate(date)),
    /** Nombre court : 1 200 → « 1,2 k ». */
    count: (value: number) =>
      value < 1000 ? String(value) : withVisibleSpaces(compactFormatter.format(value)),
    /** Nombre entier avec séparateur de milliers. */
    number: (value: number) => withVisibleSpaces(numberFormatter.format(value)),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
