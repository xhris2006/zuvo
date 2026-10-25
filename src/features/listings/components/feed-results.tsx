import { getCurrentUser } from "@/features/auth/session";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { cn } from "@/lib/utils";
import type { FeedListingData } from "../feed";
import { listingHref } from "../links";
import { getFavoriteIds } from "../queries";
import { FeedCard } from "./feed-card";

type FeedResultsProps = {
  listings: FeedListingData[];
  /** Nombre de premières cartes dont la photo est chargée en priorité. */
  priorityCount?: number;
  className?: string;
};

/** Fil d'annonces en une colonne, avec l'état « favori » de l'utilisateur connecté. */
export async function FeedResults({ listings, priorityCount = 1, className }: FeedResultsProps) {
  const viewer = await getCurrentUser();
  const favorites = await getFavoriteIds(
    viewer?.id ?? null,
    listings.map((listing) => listing.id),
  );

  return (
    <ul className={cn("mx-auto flex w-full max-w-xl flex-col gap-9", className)}>
      {listings.map((listing, index) => (
        <li key={listing.id}>
          <FeedCard
            listing={listing}
            priority={index < priorityCount}
            action={
              viewer?.id === listing.sellerId ? null : (
                <FavoriteButton
                  listingId={listing.id}
                  initialFavorited={favorites.has(listing.id)}
                  signedIn={Boolean(viewer)}
                  returnTo={listingHref(listing.id)}
                  className="size-10 bg-muted shadow-none"
                />
              )
            }
          />
        </li>
      ))}
    </ul>
  );
}
