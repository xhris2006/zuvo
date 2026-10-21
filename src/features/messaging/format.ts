import { siteConfig } from "@/config/site";

const timeFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

const dayFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: siteConfig.timeZone,
});

const weekdayFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  weekday: "short",
  timeZone: siteConfig.timeZone,
});

const shortDateFormatter = new Intl.DateTimeFormat(siteConfig.intlLocale, {
  day: "2-digit",
  month: "2-digit",
  timeZone: siteConfig.timeZone,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: siteConfig.timeZone,
});

export function formatMessageTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Clé de jour (AAAA-MM-JJ) dans le fuseau horaire du site. */
export function dayKey(date: Date | string): string {
  return dayKeyFormatter.format(typeof date === "string" ? new Date(date) : date);
}

/** « Aujourd'hui », « Hier » ou « mardi 14 octobre ». */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return "Aujourd'hui";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (key === dayKey(yesterday)) return "Hier";
  const label = dayFormatter.format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Heure compacte de la liste des conversations : « 09:05 », « Hier », « lun. », « 03/10 ». */
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return formatMessageTime(iso);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (key === dayKey(yesterday)) return "Hier";
  if (now.getTime() - new Date(iso).getTime() < 6 * 24 * 60 * 60 * 1000) {
    return weekdayFormatter.format(new Date(iso));
  }
  return shortDateFormatter.format(new Date(iso));
}
