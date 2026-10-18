import type { ListingCondition, ListingStatus } from "./constants";

/** Données minimales nécessaires pour afficher une carte d'annonce. */
export type ListingCardData = {
  id: string;
  sellerId: string;
  title: string;
  /** Prix entier en XAF (null pour un brouillon incomplet). */
  price: number | null;
  citySlug: string | null;
  condition: ListingCondition | null;
  status: ListingStatus;
  imageUrl: string | null;
};
