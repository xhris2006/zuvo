/** Onglets de la page Explorer : articles (par défaut) ou boutiques. */
export const exploreTabs = ["articles", "boutiques"] as const;
export type ExploreTab = (typeof exploreTabs)[number];

export function parseExploreTab(value: string | string[] | undefined): ExploreTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "boutiques" ? "boutiques" : "articles";
}

export const SHOP_QUERY_MAX = 60;
const MAX_TOKENS = 4;

/**
 * Terme de recherche de boutique nettoyé : seuls les lettres, chiffres,
 * espaces, points et tirets sont conservés (les autres caractères deviennent
 * des espaces). Le résultat peut être injecté sans risque dans un filtre
 * PostgREST `.or(...)` : ni virgule, ni parenthèse, ni guillemet, ni joker.
 */
export function sanitizeShopQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SHOP_QUERY_MAX)
    .trim();
}

/**
 * Mots à retrouver dans le nom ou le pseudo (tous doivent correspondre) :
 * « jp mbarga » trouve @jp_mbarga, « jean-paul » trouve « Jean-Paul Mbarga ».
 * Les mots réduits à un point ou un tiret sont ignorés.
 */
export function shopQueryTokens(query: string): string[] {
  const tokens = sanitizeShopQuery(query)
    .toLowerCase()
    .split(" ")
    .filter((token) => /[\p{L}\p{N}]/u.test(token));
  return [...new Set(tokens)].slice(0, MAX_TOKENS);
}
