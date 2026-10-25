import { siteConfig } from "@/config/site";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: siteConfig.timeZone,
});

/** Clé de jour (AAAA-MM-JJ) dans le fuseau horaire du site. */
export function dayKey(date: Date | string): string {
  return dayKeyFormatter.format(typeof date === "string" ? new Date(date) : date);
}

/**
 * Dates et heures de la messagerie dans une langue (heure du Cameroun).
 *
 * @param intlLocale Locale Intl, par exemple « fr-CM » ou « en-CM ».
 * @param labels Libellés « Aujourd'hui » et « Hier » de la langue.
 */
export function createMessageFormatters(
  intlLocale: string,
  labels: { today: string; yesterday: string },
) {
  const timeFormatter = new Intl.DateTimeFormat(intlLocale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: siteConfig.timeZone,
  });
  const dayFormatter = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: siteConfig.timeZone,
  });
  const weekdayFormatter = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    timeZone: siteConfig.timeZone,
  });
  const shortDateFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: siteConfig.timeZone,
  });

  const time = (iso: string) => timeFormatter.format(new Date(iso));

  return {
    /** Heure d'un message : « 09:05 ». */
    time,
    /** « Aujourd'hui », « Hier » ou « Mardi 14 octobre ». */
    dayLabel(iso: string, now: Date = new Date()): string {
      const key = dayKey(iso);
      if (key === dayKey(now)) return labels.today;
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (key === dayKey(yesterday)) return labels.yesterday;
      const label = dayFormatter.format(new Date(iso));
      return label.charAt(0).toUpperCase() + label.slice(1);
    },
    /** Heure compacte de la liste des conversations : « 09:05 », « Hier », « lun. », « 03/10 ». */
    inboxTime(iso: string, now: Date = new Date()): string {
      const key = dayKey(iso);
      if (key === dayKey(now)) return time(iso);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (key === dayKey(yesterday)) return labels.yesterday;
      if (now.getTime() - new Date(iso).getTime() < 6 * 24 * 60 * 60 * 1000) {
        return weekdayFormatter.format(new Date(iso));
      }
      return shortDateFormatter.format(new Date(iso));
    },
  };
}

export type MessageFormatters = ReturnType<typeof createMessageFormatters>;
