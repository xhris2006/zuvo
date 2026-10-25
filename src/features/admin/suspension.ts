/** Durées de suspension proposées ; « date » : jusqu'à une date choisie. */
export const suspensionDurations = ["permanent", "1d", "3d", "7d", "30d", "date"] as const;
export type SuspensionDuration = (typeof suspensionDurations)[number];

const DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 365;

/** Décalage horaire du Cameroun (UTC+1, sans heure d'été). */
const CAMEROON_OFFSET = "+01:00";

/** Erreurs de saisie (traduites par l'appelant). */
export type SuspensionError = "dateRequired" | "dateInPast" | "tooLong" | "invalidDuration";

export type SuspensionEnd =
  { ok: true; until: Date | null } | { ok: false; error: SuspensionError };

/**
 * Date de fin d'une suspension (null : sans date de fin). Une date choisie
 * vaut jusqu'à la fin de cette journée, heure du Cameroun.
 */
export function suspensionEnd(
  duration: string,
  date: string,
  now: Date = new Date(),
): SuspensionEnd {
  switch (duration) {
    case "permanent":
      return { ok: true, until: null };
    case "1d":
    case "3d":
    case "7d":
    case "30d":
      return { ok: true, until: new Date(now.getTime() + Number.parseInt(duration, 10) * DAY) };
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { ok: false, error: "dateRequired" };
      }
      const until = new Date(`${date}T23:59:00${CAMEROON_OFFSET}`);
      if (Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) {
        return { ok: false, error: "dateInPast" };
      }
      if (until.getTime() > now.getTime() + MAX_DAYS * DAY) {
        return { ok: false, error: "tooLong" };
      }
      return { ok: true, until };
    }
    default:
      return { ok: false, error: "invalidDuration" };
  }
}

/** Suspension en cours (une suspension temporaire expirée n'a plus d'effet). */
export function isSuspensionActive(
  suspendedAt: string | null,
  suspendedUntil: string | null,
  now: Date = new Date(),
): boolean {
  if (!suspendedAt) return false;
  return !suspendedUntil || new Date(suspendedUntil).getTime() > now.getTime();
}
