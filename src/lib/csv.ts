export type CsvCell = string | number | null | undefined;

/** Séparateur attendu par Excel en français (la virgule est le séparateur décimal). */
export const CSV_SEPARATOR = ";";

/**
 * Cellule CSV sûre : guillemets doublés et, pour éviter l'injection de
 * formules dans un tableur, apostrophe devant un texte commençant par
 * = + - @ ou une tabulation (les nombres restent des nombres).
 */
export function csvCell(value: CsvCell, separator = CSV_SEPARATOR): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /["\r\n]/.test(text) || text.includes(separator)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

/**
 * Document CSV (UTF-8 avec BOM, fins de ligne CRLF) : s'ouvre correctement
 * dans Excel comme dans LibreOffice.
 */
export function toCsv(header: string[], rows: CsvCell[][], separator = CSV_SEPARATOR): string {
  const lines = [header, ...rows].map((row) =>
    row.map((cell) => csvCell(cell, separator)).join(separator),
  );
  return `﻿${lines.join("\r\n")}\r\n`;
}
