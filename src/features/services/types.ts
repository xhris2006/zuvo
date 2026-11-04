import type { ServiceAvailability, ServicePricing, ServiceStatus } from "./constants";

/** Données d'une carte de service (listes, recherche, profil). */
export type ServiceCardData = {
  id: string;
  title: string;
  description: string;
  citySlug: string;
  district: string | null;
  price: number | null;
  pricingType: ServicePricing;
  availability: ServiceAvailability;
  category: { slug: string; name: string };
  provider: {
    id: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
    verified: boolean;
  };
  /** Photo principale, sinon la photo de profil du prestataire est utilisée. */
  imageUrl: string | null;
  featured: boolean;
  publishedAt: string;
};

/** Service de l'utilisateur connecté, avec son statut et ses statistiques. */
export type OwnServiceData = ServiceCardData & {
  status: ServiceStatus;
  removedAt: string | null;
  removedReason: string | null;
  views: number;
  requests: number;
};
