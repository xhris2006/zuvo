import { siteConfig } from "@/config/site";

const priceFormatter = new Intl.NumberFormat(siteConfig.intlLocale, {
  style: "currency",
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
});

/** Formate un montant entier en XAF, par exemple « 15 000 FCFA ». */
export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
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
