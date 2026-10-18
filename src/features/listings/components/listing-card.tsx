import { ImageOff, MapPin } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCity } from "@/config/locations";
import { getDictionary } from "@/i18n";
import { formatPrice } from "@/lib/format";
import type { ListingCardData } from "../types";
import { ListingStatusBadge } from "./listing-status-badge";

type ListingCardProps = {
  listing: ListingCardData;
  /** Action superposée à la photo (ex. bouton favori). */
  action?: ReactNode;
  /** Charger l'image en priorité (annonces visibles au premier affichage). */
  priority?: boolean;
};

export function listingHref(id: string): Route {
  return `/annonces/${id}` as Route;
}

export function ListingCard({ listing, action, priority = false }: ListingCardProps) {
  const t = getDictionary();
  const city = getCity(listing.citySlug)?.name ?? listing.citySlug;
  const showStatus = listing.status !== "active";

  return (
    <article className="group relative flex flex-col gap-2.5">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={t.listing.photoAlt(listing.title)}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 18rem, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
        <p className="text-base font-bold tracking-tight">{formatPrice(listing.price)}</p>
        <h3 className="line-clamp-1 text-sm text-foreground">
          <Link
            href={listingHref(listing.id)}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {listing.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{t.listing.conditions[listing.condition]}</span>
          <span aria-hidden="true">·</span>
          <MapPin className="size-3" aria-hidden="true" />
          <span>{city}</span>
        </p>
      </div>
    </article>
  );
}
