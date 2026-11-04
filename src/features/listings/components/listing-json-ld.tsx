import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import type { ListingCondition, ListingStatus } from "../constants";

const availability: Record<ListingStatus, string> = {
  draft: "https://schema.org/PreOrder",
  active: "https://schema.org/InStock",
  reserved: "https://schema.org/LimitedAvailability",
  sold: "https://schema.org/SoldOut",
  withdrawn: "https://schema.org/Discontinued",
};

const itemCondition: Record<ListingCondition, string> = {
  new_with_tags: "https://schema.org/NewCondition",
  new_without_tags: "https://schema.org/NewCondition",
  very_good: "https://schema.org/UsedCondition",
  good: "https://schema.org/UsedCondition",
  fair: "https://schema.org/UsedCondition",
  for_parts: "https://schema.org/DamagedCondition",
};

type ListingJsonLdProps = {
  url: string;
  title: string;
  description: string;
  images: string[];
  price: number | null;
  status: ListingStatus;
  condition: ListingCondition | null;
  category?: string | null;
};

/**
 * Données structurées schema.org (Product) pour les moteurs de recherche. Sans
 * prix, l'annonce n'a pas d'offre valide : rien n'est publié plutôt qu'un
 * Product incomplet (aucun avis ni note n'est jamais inventé).
 */
export function ListingJsonLd(props: ListingJsonLdProps) {
  if (props.price === null) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: props.title,
    description: props.description,
    image: props.images,
    category: props.category ?? undefined,
    url: props.url,
    offers: {
      "@type": "Offer",
      price: props.price,
      priceCurrency: siteConfig.currency,
      availability: availability[props.status],
      itemCondition: props.condition ? itemCondition[props.condition] : undefined,
      url: props.url,
    },
  };
  return <JsonLd data={data} />;
}
