import { defaultCategories } from "@/features/categories/data";
import type { ListingCardData } from "@/features/listings/types";

/** Vignette de la mosaïque d'accueil : photo d'annonce ou catégorie (si les photos manquent). */
export type MosaicTile =
  | { kind: "photo"; key: string; listingId: string; imageUrl: string }
  | { kind: "placeholder"; key: string; categorySlug: string };

/**
 * Répartit les photos des annonces en colonnes pour la mosaïque d'accueil.
 * Les annonces sans photo et les doublons (même annonce ou même photo) sont
 * ignorés ; les photos sont distribuées tour à tour dans chaque colonne, puis
 * complétées par des vignettes de catégorie pour que chaque colonne soit pleine.
 */
export function buildMosaicColumns(
  listings: readonly Pick<ListingCardData, "id" | "imageUrl">[],
  columns = 3,
  perColumn = 4,
): MosaicTile[][] {
  const columnCount = Math.max(1, Math.floor(columns));
  const capacity = columnCount * Math.max(1, Math.floor(perColumn));

  const tiles: MosaicTile[] = [];
  const seenListings = new Set<string>();
  const seenImages = new Set<string>();
  for (const listing of listings) {
    if (tiles.length === capacity) break;
    if (!listing.imageUrl || seenListings.has(listing.id) || seenImages.has(listing.imageUrl)) {
      continue;
    }
    seenListings.add(listing.id);
    seenImages.add(listing.imageUrl);
    tiles.push({
      kind: "photo",
      key: `photo-${listing.id}`,
      listingId: listing.id,
      imageUrl: listing.imageUrl,
    });
  }

  for (let index = 0; tiles.length < capacity; index += 1) {
    const category = defaultCategories[index % defaultCategories.length]!;
    tiles.push({
      kind: "placeholder",
      key: `placeholder-${index}`,
      categorySlug: category.slug,
    });
  }

  return Array.from({ length: columnCount }, (_, column) =>
    tiles.filter((_, index) => index % columnCount === column),
  );
}
