import type { ServerDictionary } from "@/i18n/server-dictionaries";

type AuthErrorTexts = ServerDictionary["authErrors"];

/**
 * Traduit les erreurs de Supabase Auth en messages destinés à l'utilisateur.
 * Le message technique d'origine n'est jamais affiché.
 */
export function authErrorMessage(
  texts: AuthErrorTexts,
  error: { code?: string; status?: number } | null | undefined,
): string {
  if (!error) return texts.generic;
  if (error.code && Object.hasOwn(texts.codes, error.code)) return texts.codes[error.code]!;
  if (error.status === 429) return texts.codes.over_request_rate_limit!;
  return texts.generic;
}

/** Codes d'erreur transmis dans l'URL après un lien e-mail ou OAuth. */
export const callbackErrorCodes = ["lien-invalide", "connexion-echouee"] as const;

export type CallbackErrorCode = (typeof callbackErrorCodes)[number];

export function callbackErrorMessage(texts: AuthErrorTexts, code: unknown): string | null {
  return callbackErrorCodes.some((known) => known === code)
    ? (texts.callback[code as CallbackErrorCode] ?? null)
    : null;
}
