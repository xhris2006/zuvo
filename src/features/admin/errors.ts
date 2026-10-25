export const FORBIDDEN = "Action réservée à l'administration.";

type RpcError = { code?: string; message?: string } | null;

/** Messages des erreurs métier renvoyées par les fonctions SQL d'administration. */
const knownErrors: Record<string, string> = {
  invalid_suspension_end: "La date de fin de suspension est invalide.",
  cannot_moderate_self: "Cette action n'est pas possible sur votre propre compte.",
  cannot_moderate_staff: "Cette action n'est pas possible sur un membre de l'équipe.",
  cannot_change_own_role: "Vous ne pouvez pas modifier votre propre rôle.",
  user_suspended: "Ce compte est suspendu : réactivez-le avant de lui attribuer un rôle.",
  role_unchanged: "Ce rôle est déjà dans cet état.",
};

/** Message lisible pour une erreur d'une fonction ou d'une table d'administration. */
export function adminErrorMessage(error: RpcError): string {
  const known = error?.message ? knownErrors[error.message] : undefined;
  if (known) return known;
  switch (error?.code) {
    case "42501":
      return FORBIDDEN;
    case "P0002":
      return "Élément introuvable ou déjà traité.";
    case "22023":
      return "Indiquez un motif d'au moins 3 caractères.";
    case "23505":
      return "Cet élément existe déjà.";
    case "23514":
      return "Valeur refusée : vérifiez le format des champs.";
    default:
      return "L'action a échoué. Veuillez réessayer.";
  }
}
