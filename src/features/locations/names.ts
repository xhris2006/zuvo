/** Format des identifiants de ville stockés en base (contrainte SQL identique). */
export const CITY_SLUG_PATTERN = /^[a-z0-9-]{1,60}$/;

/** Nom d'une ville d'après un annuaire ; l'identifiant brut si elle est inconnue. */
export function cityNameFrom(
  slug: string | null | undefined,
  names: ReadonlyMap<string, string>,
): string | null {
  if (!slug) return null;
  return names.get(slug) ?? slug;
}

/**
 * Identifiant stable (slug) à partir d'un nom : minuscules sans accents,
 * mots séparés par des tirets. « Édéa » → « edea », « Mont Fébé » → « mont-febe ».
 */
export function slugify(value: string, maxLength = 60): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
