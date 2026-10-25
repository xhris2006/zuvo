import { ImageOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { LinkPending } from "@/components/ui/link-pending";
import { publicProfileHref } from "@/config/routes";
import { cityName } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { VerifiedBadge } from "@/features/profiles/components/verified-badge";
import { getT } from "@/i18n/server";
import type { FeedListingData } from "../feed";
import { listingHref } from "../links";
import { FeedCardPhotos } from "./feed-card-photos";
import { ListingStatusBadge } from "./listing-status-badge";

type FeedCardProps = {
  listing: FeedListingData;
  /** Action à droite du prix (ex. bouton favori). */
  action?: ReactNode;
  /** Charger la photo en priorité (première carte visible). */
  priority?: boolean;
};

/** Carte du fil : photos à faire défiler, vendeur à cheval sur la photo, prix et détails. */
export async function FeedCard({ listing, action, priority = false }: FeedCardProps) {
  const t = await getT();
  const city = await cityName(listing.citySlug);
  const details = [city, listing.condition ? t.listing.conditions[listing.condition] : null]
    .filter(Boolean)
    .join(" · ");
  const seller = listing.seller;

  const href = listingHref(listing.id);
  const status =
    listing.status !== "active" ? (
      <ListingStatusBadge status={listing.status} className="absolute top-2.5 left-2.5" />
    ) : null;

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        {listing.imageUrls.length > 0 ? (
          // Au-dessus du lien du titre pour recevoir le balayage.
          <FeedCardPhotos
            urls={listing.imageUrls}
            title={listing.title}
            href={href}
            priority={priority}
            sizes="(min-width: 1024px) 24rem, (min-width: 768px) 50vw, 100vw"
            className="z-[1] aspect-square rounded-2xl"
          >
            {status}
          </FeedCardPhotos>
        ) : (
          <div className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground">
            <ImageOff className="size-7" aria-hidden="true" />
            <span className="text-sm">{t.listing.noPhoto}</span>
            {status}
          </div>
        )}
        {seller ? (
          // Doublon visuel du lien « nom du vendeur » : retiré du parcours clavier.
          <Link
            href={publicProfileHref(seller.username)}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute -bottom-5 left-3 z-10 rounded-full ring-[3px] ring-background transition-transform hover:scale-105"
          >
            <Avatar
              name={seller.displayName}
              src={avatarUrl(seller.avatarPath)}
              className="size-10 text-sm"
            />
          </Link>
        ) : null}
      </div>

      <p className="flex min-h-6 min-w-0 items-center gap-1.5 pt-1 pr-1 pl-[3.75rem] text-[0.8125rem] text-muted-foreground">
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
            {t.format.relativeTime(listing.publishedAt)}
          </time>
        ) : null}
      </p>

      <div className="flex items-start gap-2 px-1 pt-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-base font-bold tracking-tight">
            {listing.price === null ? t.listing.priceTbd : t.format.price(listing.price)}
          </p>
          <h3 className="line-clamp-1 text-sm text-foreground">
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
            >
              {listing.title}
              <LinkPending className="bottom-auto aspect-square rounded-2xl" />
            </Link>
          </h3>
          {details ? <p className="truncate text-xs text-muted-foreground">{details}</p> : null}
        </div>
        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
    </article>
  );
}
