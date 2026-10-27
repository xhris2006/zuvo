import { ImageOff, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LinkPending } from "@/components/ui/link-pending";
import { cityName } from "@/features/locations/queries";
import { getT } from "@/i18n/server";
import { listingHref } from "../links";
import type { ListingCardData } from "../types";
import { ListingStatusBadge } from "./listing-status-badge";

type ListingCardProps = {
  listing: ListingCardData;
  /** Action superposée à la photo (ex. bouton favori). */
  action?: ReactNode;
  /** Charger l'image en priorité (annonces visibles au premier affichage). */
  priority?: boolean;
};

export async function ListingCard({ listing, action, priority = false }: ListingCardProps) {
  const t = await getT();
  const city = await cityName(listing.citySlug);
  const showStatus = listing.status !== "active";

  return (
    <article className="group reveal-on-scroll relative flex flex-col gap-2.5">
      <div className="hover-sheen relative aspect-[4/5] overflow-hidden rounded-xl bg-muted transition-[translate,scale,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:shadow-[0_18px_36px_-18px_rgb(15_27_45/0.45)] group-active:scale-[0.98]">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={t.listing.photoAlt(listing.title)}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 18rem, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="text-xs">{t.listing.noPhoto}</span>
          </div>
        )}
        {showStatus ? (
          <ListingStatusBadge status={listing.status} className="absolute top-2.5 left-2.5" />
        ) : null}
        {action ? <div className="absolute top-2 right-2 z-10">{action}</div> : null}
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="text-base font-bold tracking-tight">
          {listing.price === null ? t.listing.priceTbd : t.format.price(listing.price)}
        </p>
        <h3 className="line-clamp-1 text-sm text-foreground">
          <Link
            href={listingHref(listing.id)}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {listing.title}
            <LinkPending className="bottom-auto aspect-[4/5]" />
          </Link>
        </h3>
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {listing.condition ? (
            <span className="truncate">{t.listing.conditions[listing.condition]}</span>
          ) : null}
          {listing.condition && city ? <span aria-hidden="true">·</span> : null}
          {city ? (
            <>
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{city}</span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
