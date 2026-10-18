/** Numéro de page valide (entier ≥ 1) à partir d'un paramètre d'URL. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}
