import { Constants } from "@/lib/supabase/database.types";

export const servicePricingTypes = Constants.public.Enums.service_pricing;
export const serviceAvailabilities = Constants.public.Enums.service_availability;

export type ServicePricing = (typeof servicePricingTypes)[number];
export type ServiceAvailability = (typeof serviceAvailabilities)[number];
export type ServiceStatus = (typeof Constants.public.Enums.service_status)[number];

/** Limites partagées entre la validation du formulaire et celle du serveur (miroir du SQL). */
export const serviceLimits = {
  titleMin: 3,
  titleMax: 80,
  descriptionMin: 20,
  descriptionMax: 3000,
  districtMax: 60,
  availabilityNoteMax: 200,
  extraInfoMax: 1000,
  maxImages: 8,
  priceMax: 100_000_000,
  /** Côté le plus long des photos après traitement dans le navigateur. */
  imageMaxDimension: 1600,
} as const;

/** Services par page de résultats. */
export const SERVICES_PAGE_SIZE = 24;
