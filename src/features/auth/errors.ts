/**
 * Traduit les erreurs de Supabase Auth en messages destinés à l'utilisateur.
 * Le message technique d'origine n'est jamais affiché.
 */
const messages: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed:
    "Votre adresse e-mail n'est pas encore confirmée. Ouvrez le lien reçu par e-mail.",
  weak_password:
    "Ce mot de passe est trop faible. Utilisez au moins 8 caractères, avec des lettres et des chiffres.",
  same_password: "Le nouveau mot de passe doit être différent de l'actuel.",
  over_email_send_rate_limit: "Trop d'e-mails envoyés. Réessayez dans quelques minutes.",
  over_request_rate_limit: "Trop de tentatives. Réessayez dans quelques minutes.",
  signup_disabled: "Les inscriptions sont momentanément fermées.",
  email_provider_disabled: "La connexion par e-mail est momentanément indisponible.",
  provider_disabled: "Ce mode de connexion n'est pas disponible.",
  otp_expired: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
  flow_state_expired: "La connexion a expiré. Veuillez recommencer.",
  flow_state_not_found: "La connexion a expiré. Veuillez recommencer.",
  bad_code_verifier: "La connexion a échoué. Recommencez depuis ce navigateur.",
  session_not_found: "Votre session a expiré. Reconnectez-vous.",
  reauthentication_needed: "Reconnectez-vous avant de modifier votre mot de passe.",
  user_banned: "Ce compte est suspendu.",
};

export const genericAuthError = "Une erreur est survenue. Veuillez réessayer.";

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined) {
  if (!error) return genericAuthError;
  if (error.code && Object.hasOwn(messages, error.code)) return messages[error.code]!;
  if (error.status === 429) return messages.over_request_rate_limit!;
  return genericAuthError;
}

/** Codes d'erreur transmis dans l'URL après un lien e-mail ou OAuth. */
export const callbackErrorMessages = {
  "lien-invalide": "Ce lien est invalide ou a expiré. Demandez-en un nouveau.",
  "connexion-echouee": "La connexion n'a pas abouti. Veuillez réessayer.",
} as const;

export type CallbackErrorCode = keyof typeof callbackErrorMessages;

export function callbackErrorMessage(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(callbackErrorMessages, code)
    ? callbackErrorMessages[code as CallbackErrorCode]
    : null;
}
