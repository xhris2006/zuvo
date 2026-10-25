import type { Dictionary } from "@/i18n";

type ValidationMessages = Dictionary["validation"];
export type ValidationCode = keyof ValidationMessages;

/** Séparateur entre le code et ses paramètres (absent des textes saisis). */
const SEPARATOR = "\u001f";

/**
 * Message de validation sous forme de code (et de paramètres), traduit à
 * l'affichage dans la langue de l'utilisateur : les schémas Zod restent
 * uniques, quelle que soit la langue.
 */
export function vm(code: ValidationCode, ...params: Array<string | number>): string {
  return [code, ...params].join(SEPARATOR);
}

/** Traduit un message produit par `vm` ; tout autre texte est renvoyé tel quel. */
export function translateValidation(message: string, messages: ValidationMessages): string {
  const [code, ...params] = message.split(SEPARATOR);
  const entry = (messages as Record<string, unknown>)[code ?? ""];
  if (typeof entry === "string") return entry;
  if (typeof entry === "function") return (entry as (...args: string[]) => string)(...params);
  return message;
}
