import { publicStorageUrl } from "@/lib/supabase/config";

export const LISTING_IMAGE_BUCKET = "listing-images";

/** URL publique d'une photo d'annonce. */
export function listingImageUrl(path: string): string | null {
  return publicStorageUrl(LISTING_IMAGE_BUCKET, path);
}

/** Chemin Storage d'une nouvelle photo : <vendeur>/<annonce>/<fichier>. */
export function newListingImagePath(sellerId: string, listingId: string, extension: string) {
  return `${sellerId}/${listingId}/${crypto.randomUUID()}.${extension}`;
}
