/** Dates de dernière mise à jour des documents d'information (format ISO). */
export const legalUpdatedAt = {
  privacy: "2026-11-04",
  terms: "2026-11-04",
  reports: "2026-11-04",
} as const;

export type Publisher = {
  /** Nom de la personne ou raison sociale de la société qui édite le service. */
  name: string;
  /** Adresse postale, si elle doit être publiée. */
  address?: string;
  /** Immatriculation (RCCM, identifiant fiscal…), si applicable. */
  registration?: string;
};

/**
 * Éditeur du service, cité dans la politique de confidentialité et les
 * conditions d'utilisation. À renseigner par le propriétaire avec ses
 * informations réelles ; tant qu'il est absent, les documents désignent
 * « l'équipe MboaDeal » sans inventer d'identité ni d'adresse.
 */
export const publisher: Publisher | null = null;
