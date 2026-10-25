/**
 * Maximum « rond » de l'axe vertical (1, 2, 5 × 10ⁿ), au moins 1 : les
 * colonnes gardent des proportions lisibles et la graduation reste simple.
 */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((factor) => factor * magnitude >= value) ?? 10;
  return step * magnitude;
}

/** Hauteur relative d'une valeur (0 à 100 %). */
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}
