import { siteConfig } from "@/config/site";

const priceFormatter = new Intl.NumberFormat(siteConfig.intlLocale, {
  style: "currency",
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
});

/** Formate un montant entier en XAF, par exemple « 15 000 FCFA ». */
export function formatPrice(amount: number): string {
  return withVisibleSpaces(priceFormatter.format(amount));
}

/**
 * Intl sépare les milliers par une espace fine insécable (U+202F), absente de
 * certaines polices : on utilise une espace insécable classique (U+00A0).
 */
function withVisibleSpaces(value: string): string {
  return value.replace(/ /g, " ");
}

const dateFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: siteConfig.timeZone,
});

export function formatDate(date: Date | string): string {
  return dateFormatter.format(typeof date === "string" ? new Date(date) : date);
}

const dateTimeFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

/** « 18 oct. 2026, 14:05 » (heure du Cameroun). */
export function formatDateTime(date: Date | string): string {
  return dateTimeFormatter.format(typeof date === "string" ? new Date(date) : date);
}

const relativeFormatter = new Intl.RelativeTimeFormat(siteConfig.intlLocale, {
  numeric: "auto",
});

const relativeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** « il y a 3 heures », « hier »… Les durées inférieures à une minute renvoient « à l'instant ». */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const elapsedSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  for (const [unit, secondsInUnit] of relativeUnits) {
    if (Math.abs(elapsedSeconds) >= secondsInUnit) {
      return relativeFormatter.format(Math.round(elapsedSeconds / secondsInUnit), unit);
    }
  }
  return "à l'instant";
}

const monthYearFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  month: "long",
  year: "numeric",
  timeZone: siteConfig.timeZone,
});

/** « octobre 2026 ». */
export function formatMonthYear(date: Date | string): string {
  return monthYearFormatter.format(typeof date === "string" ? new Date(date) : date);
}

const compactFormatter = new Intl.NumberFormat(siteConfig.intlLocale, {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Nombre court : 1 200 → « 1,2 k ». */
export function formatCount(value: number): string {
  return value < 1000 ? String(value) : withVisibleSpaces(compactFormatter.format(value));
}
