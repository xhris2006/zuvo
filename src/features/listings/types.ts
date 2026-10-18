import type { ListingCondition, ListingStatus } from "./constants";

/** Données minimales nécessaires pour afficher une carte d'annonce. */
export type ListingCardData = {
  id: string;
  title: string;
  /** Prix entier en XAF. */
  price: number;
  citySlug: string;
  condition: ListingCondition;
  status: ListingStatus;
  imageUrl: string | null;
};
