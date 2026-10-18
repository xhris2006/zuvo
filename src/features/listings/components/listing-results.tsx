import { getCurrentUser } from "@/features/auth/session";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { listingHref } from "../links";
import { getFavoriteIds } from "../queries";
import type { ListingCardData } from "../types";
import { ListingCard } from "./listing-card";
import { ListingGrid } from "./listing-grid";

type ListingResultsProps = {
  listings: ListingCardData[];
  /** Nombre de premières cartes dont l'image est chargée en priorité. */
  priorityCount?: number;
};

/** Grille d'annonces avec l'état « favori » de l'utilisateur connecté. */
export async function ListingResults({ listings, priorityCount = 0 }: ListingResultsProps) {
  const viewer = await getCurrentUser();
  const favorites = await getFavoriteIds(
    viewer?.id ?? null,
    listings.map((listing) => listing.id),
  );

  return (
    <ListingGrid>
      {listings.map((listing, index) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          priority={index < priorityCount}
          action={
            viewer?.id === listing.sellerId ? null : (
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={favorites.has(listing.id)}
                signedIn={Boolean(viewer)}
                returnTo={listingHref(listing.id)}
              />
            )
          }
        />
      ))}
    </ListingGrid>
  );
}
