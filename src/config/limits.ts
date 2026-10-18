/** Limites métier partagées entre la validation client et serveur. */
export const listingLimits = {
  maxImages: 8,
  maxImageBytes: 8 * 1024 * 1024,
  acceptedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  titleMin: 3,
  titleMax: 80,
  /** Longueur minimale de la description pour publier (contrainte SQL). */
  descriptionMin: 10,
  descriptionMax: 2000,
  /** Taille maximale (côté le plus long) des photos après traitement. */
  imageMaxDimension: 1600,
  /** Prix maximal accepté en XAF (100 millions FCFA). */
  priceMax: 100_000_000,
} as const;

export const searchLimits = {
  queryMax: 100,
  pageSize: 24,
} as const;
