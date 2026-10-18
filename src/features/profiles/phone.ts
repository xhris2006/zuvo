const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Normalise un numéro de téléphone au format international E.164.
 * Les numéros camerounais à 9 chiffres (6XX XX XX XX ou 2XX XX XX XX) reçoivent
 * l'indicatif +237. Retourne null si le numéro est invalide.
 */
export function normalizePhone(input: string): string | null {
  let value = input.trim().replace(/[\s.\-()]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (/^[26]\d{8}$/.test(value)) value = `+237${value}`;
  else if (/^237[26]\d{8}$/.test(value)) value = `+${value}`;
  return E164.test(value) ? value : null;
}

/** Affichage lisible : +237 6 90 00 00 00. */
export function formatPhone(value: string): string {
  const match = value.match(/^\+237([26])(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return value;
  return `+237 ${match.slice(1).join(" ")}`;
}
