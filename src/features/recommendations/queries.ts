import "server-only";
import { CARD_COLUMNS, toListingCard } from "@/features/listings/queries";
import type { ListingCardData } from "@/features/listings/types";
import { createSupabaseServerClient, type TypedSupabaseClient } from "@/lib/supabase/server";

/** Cartes des annonces dans l'ordre donné ; une annonce devenue invisible est ignorée. */
async function cardsInOrder(
  supabase: TypedSupabaseClient,
  ids: string[],
): Promise<ListingCardData[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("listings").select(CARD_COLUMNS).in("id", ids);
  if (error || !data) return [];
  const cards = new Map(data.map((row) => [row.id, toListingCard(row)]));
  return ids.flatMap((id) => cards.get(id) ?? []);
}

/**
 * Annonces recommandées au membre connecté, d'après ses consultations, ses
 * favoris, ses conversations et les profils qu'il suit (fonction SQL
 * recommended_listings). Liste vide sans activité ou en cas d'indisponibilité.
 */
export async function getRecommendedListings(limit = 12): Promise<ListingCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("recommended_listings", { p_limit: limit });
  if (error || !data) return [];
  return cardsInOrder(
    supabase,
    data.map((row) => row.listing_id),
  );
}

/**
 * Annonces similaires à une annonce (catégorie, mots du titre, ville, prix,
 * favoris croisés). Sans la fonction SQL (migration non appliquée) : les plus
 * récentes de la même catégorie.
 */
export async function getSimilarListings(
  listingId: string,
  categoryId: string | null,
  limit = 12,
): Promise<ListingCardData[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("similar_listings", {
    p_listing_id: listingId,
    p_limit: limit,
  });
  if (!error && data) {
    return cardsInOrder(
      supabase,
      data.map((row) => row.listing_id),
    );
  }
  if (!categoryId) return [];
  const { data: fallback } = await supabase
    .from("listings")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .eq("category_id", categoryId)
    .neq("id", listingId)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (fallback ?? []).map(toListingCard);
}

/**
 * Inscrit la consultation d'une annonce dans l'historique privé du membre
 * connecté (ignoré pour le vendeur ; sans effet si la base est indisponible).
 */
export async function recordListingView(listingId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase.rpc("record_listing_view", { p_listing_id: listingId });
}

/** Efface l'historique de consultation du membre connecté. */
export async function clearListingViews(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { error } = await supabase.from("listing_views").delete().eq("user_id", userId);
  return !error;
}
