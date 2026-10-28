/** Minuscules sans accents, caractère par caractère, avec la position d'origine de chacun. */
function foldWithPositions(value: string): { folded: string; ends: number[] } {
  let folded = "";
  const ends: number[] = [];
  let index = 0;
  for (const char of value) {
    index += char.length;
    for (const piece of char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()) {
      folded += piece;
      ends.push(index);
    }
  }
  return { folded, ends };
}

/** Texte comparable : minuscules, sans accents (« Électroménager » → « electromenager »). */
export function foldText(value: string): string {
  return foldWithPositions(value).folded;
}

/**
 * Suite proposée en grisé après la saisie : fin du mot en cours et mot
 * suivant de la première suggestion qui commence par la saisie (« iph » +
 * « iPhone 12 Pro » → « one 12 »). Chaîne vide si aucune ne convient.
 */
export function inlineCompletion(input: string, candidates: readonly string[]): string {
  const typed = foldText(input);
  if (typed.trim().length === 0) return "";
  for (const candidate of candidates) {
    const { folded, ends } = foldWithPositions(candidate);
    if (folded.length <= typed.length || !folded.startsWith(typed)) continue;
    const rest = candidate.slice(ends[typed.length - 1]);
    const suffix = /^\S*(?:\s+\S+)?/u.exec(rest)?.[0] ?? "";
    if (suffix.length > 0) return suffix;
  }
  return "";
}

/**
 * Titres sans doublons (accents et majuscules ignorés), ceux qui commencent
 * par la saisie en premier, dans la limite demandée.
 */
export function rankTitles(input: string, titles: readonly string[], limit: number): string[] {
  const typed = foldText(input).trim();
  const seen = new Set<string>();
  const starting: string[] = [];
  const others: string[] = [];
  for (const raw of titles) {
    const title = raw.replace(/\s+/g, " ").trim();
    const key = foldText(title);
    if (title.length === 0 || seen.has(key)) continue;
    seen.add(key);
    (key.startsWith(typed) ? starting : others).push(title);
  }
  return [...starting, ...others].slice(0, limit);
}
