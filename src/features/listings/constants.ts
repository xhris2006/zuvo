export const listingConditions = [
  "new_with_tags",
  "new_without_tags",
  "very_good",
  "good",
  "fair",
  "for_parts",
] as const;

export type ListingCondition = (typeof listingConditions)[number];

export const listingStatuses = ["draft", "active", "reserved", "sold", "withdrawn"] as const;

export type ListingStatus = (typeof listingStatuses)[number];

/** Statuts visibles publiquement (les brouillons et annonces retirées restent privés). */
export const publicListingStatuses = [
  "active",
  "reserved",
  "sold",
] as const satisfies readonly ListingStatus[];
