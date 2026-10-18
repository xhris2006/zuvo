/** Format accepté (identique à la contrainte SQL profiles_username_format). */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

/**
 * Noms réservés — doit rester identique à private.is_reserved_username()
 * (supabase/migrations/*_foundations.sql) ; un test vérifie la cohérence.
 */
export const reservedUsernames = [
  "admin",
  "administrateur",
  "moderateur",
  "moderation",
  "support",
  "aide",
  "help",
  "zuvo",
  "equipe",
  "team",
  "staff",
  "officiel",
  "official",
  "system",
  "systeme",
  "api",
  "root",
  "null",
  "undefined",
  "contact",
  "securite",
  "security",
  "explorer",
  "vendre",
  "messages",
  "profil",
  "favoris",
  "notifications",
  "connexion",
  "inscription",
  "conditions",
  "confidentialite",
  "signalements",
  "annonces",
] as const;

const reserved = new Set<string>(reservedUsernames);

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function isReservedUsername(value: string): boolean {
  return reserved.has(value.toLowerCase());
}
