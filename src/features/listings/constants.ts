import { Constants, type Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

/** États possibles d'un article (source de vérité : type SQL listing_condition). */
export const listingConditions = Constants.public.Enums.listing_condition;
export type ListingCondition = Enums["listing_condition"];

/** Statuts d'une annonce (source de vérité : type SQL listing_status). */
export const listingStatuses = Constants.public.Enums.listing_status;
export type ListingStatus = Enums["listing_status"];

/** Statuts visibles publiquement (les brouillons et annonces retirées restent privés). */
export const publicListingStatuses = [
  "active",
  "reserved",
  "sold",
] as const satisfies readonly ListingStatus[];
