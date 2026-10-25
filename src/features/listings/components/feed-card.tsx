import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { LinkPending } from "@/components/ui/link-pending";
import { publicProfileHref } from "@/config/routes";
import { cityName } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { VerifiedBadge } from "@/features/profiles/components/verified-badge";
import { getDictionary } from "@/i18n";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { FeedListingData } from "../feed";
import { listingHref } from "../links";
import { ListingStatusBadge } from "./listing-status-badge";

type FeedCardProps = {
  listing: FeedListingData;
  /** Action à droite du prix (ex. bouton favori). */
  action?: ReactNode;
  /** Charger la photo en priorité (première carte visible). */
  priority?: boolean;
};

/** Carte du fil : grande photo, vendeur à cheval sur la photo, prix et détails. */
export async function FeedCard({ listing, action, priority = false }: FeedCardProps) {
  const t = getDictionary();
  const city = await cityName(listing.citySlug);
  const details = [city, listing.condition ? t.listing.conditions[listing.condition] : null]
    .filter(Boolean)
    .join(" · ");
  const seller = listing.seller;

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted transition-transform duration-150 group-active:scale-[0.99]">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt={t.listing.photoAlt(listing.title)}
              fill
              loading={priority ? "eager" : undefined}
              fetchPriority={priority ? "high" : undefined}
              sizes="(min-width: 640px) 36rem, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="size-7" aria-hidden="true" />
              <span className="text-sm">{t.listing.noPhoto}</span>
            </div>
          )}
          {listing.status !== "active" ? (
            <ListingStatusBadge status={listing.status} className="absolute top-3 left-3" />
          ) : null}
        </div>
        {seller ? (
          // Doublon visuel du lien « nom du vendeur » : retiré du parcours clavier.
          <Link
            href={publicProfileHref(seller.username)}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute -bottom-6 left-4 z-10 rounded-full ring-4 ring-background transition-transform hover:scale-105"
          >
            <Avatar
              name={seller.displayName}
              src={avatarUrl(seller.avatarPath)}
              className="size-12 text-base"
            />
          </Link>
        ) : null}
      </div>

      <p className="flex min-h-7 min-w-0 items-center gap-1.5 pt-1.5 pr-1 pl-[4.75rem] text-sm text-muted-foreground">
        {seller ? (
          <>
            <Link
              href={publicProfileHref(seller.username)}
              aria-label={t.listing.sellerProfile(seller.displayName)}
              className="relative z-10 truncate font-semibold text-foreground hover:underline"
            >
              {seller.displayName}
            </Link>
            {seller.verified ? <VerifiedBadge variant="icon" className="relative z-10" /> : null}
            {listing.publishedAt ? <span aria-hidden="true">·</span> : null}
          </>
        ) : null}
        {listing.publishedAt ? (
          <time dateTime={listing.publishedAt} className="shrink-0">
            {formatRelativeTime(listing.publishedAt)}
          </time>
        ) : null}
      </p>

      <div className="flex items-start gap-3 px-1 pt-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-lg font-bold tracking-tight">
            {listing.price === null ? "Prix à définir" : formatPrice(listing.price)}
          </p>
          <h3 className="line-clamp-2 text-[0.9375rem] text-foreground">
            <Link
              href={listingHref(listing.id)}
              className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
            >
              {listing.title}
              <LinkPending className="bottom-auto aspect-[4/5] rounded-3xl" />
            </Link>
          </h3>
          {details ? <p className="truncate text-sm text-muted-foreground">{details}</p> : null}
        </div>
        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
    </article>
  );
}
