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

/** Données structurées schema.org (Product) pour les moteurs de recherche. */
export function ListingJsonLd(props: ListingJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: props.title,
    description: props.description,
    image: props.images,
    category: props.category ?? undefined,
    url: props.url,
    offers:
      props.price === null
        ? undefined
        : {
            "@type": "Offer",
            price: props.price,
            priceCurrency: siteConfig.currency,
            availability: availability[props.status],
            itemCondition: props.condition ? itemCondition[props.condition] : undefined,
            url: props.url,
          },
  };
  return (
    <script
      type="application/ld+json"
      // Échappement de « < » pour empêcher toute fermeture prématurée de la balise.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
