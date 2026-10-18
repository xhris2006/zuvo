const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 40;

/**
 * Construit une requête plein texte PostgreSQL (to_tsquery) à partir de la
 * saisie : chaque mot devient une recherche par préfixe (« iphon » trouve
 * « iPhone »), tous les mots sont requis. Seuls lettres et chiffres sont
 * conservés, ce qui neutralise la syntaxe tsquery (&, |, !, :, parenthèses…).
 */
export function buildPrefixTsQuery(input: string): string | null {
  const terms = input
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 0)
    .slice(0, MAX_TERMS)
    .map((term) => term.slice(0, MAX_TERM_LENGTH));
  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}
