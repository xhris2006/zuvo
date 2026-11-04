import type { Dictionary } from "@/i18n";
import type { ServicePricing } from "./constants";

/** Prix affiché selon la tarification : « À partir de 10 000 FCFA », « Sur devis »… */
export function servicePriceLabel(
  t: Pick<Dictionary, "services" | "format">,
  pricingType: ServicePricing,
  price: number | null,
): string {
  if (pricingType === "quote" || price === null) return t.services.pricing.quote();
  return t.services.pricing[pricingType](t.format.price(price));
}
