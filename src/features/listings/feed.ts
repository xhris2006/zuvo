import "server-only";
import { searchLimits } from "@/config/limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, ListingQueryError, toListingCard } from "./queries";
import type { ListingCardData } from "./types";

/** Annonce affichée dans le fil : carte enrichie du vendeur et de la date de publication. */
export type FeedListingData = ListingCardData & {
  publishedAt: string | null;
  seller: {
    username: string;
    displayName: string;
    avatarPath: string | null;
    verified: boolean;
  } | null;
};

export type FeedResult = { items: FeedListingData[]; total: number; pageSize: number };

const FEED_COLUMNS =
  `${CARD_COLUMNS}, seller:profiles!seller_id(username, display_name, avatar_path, verified_at)` as const;

type FeedOptions = {
  /** Limite le fil aux vendeurs suivis par cet utilisateur. */
  followerId?: string;
  page?: number;
  pageSize?: number;
};

/** Annonces en vente, les plus récentes d'abord, avec leur vendeur. */
export async function getFeedListings({
  followerId,
  page = 1,
  pageSize = searchLimits.pageSize,
}: FeedOptions = {}): Promise<FeedResult> {
  const empty: FeedResult = { items: [], total: 0, pageSize };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return empty;

  let sellerIds: string[] | null = null;
  if (followerId) {
    const { data: follows, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", followerId)
      .limit(1000);
    if (followsError) throw new ListingQueryError();
    sellerIds = (follows ?? []).map((row) => row.following_id);
    if (sellerIds.length === 0) return empty;
  }

  let query = supabase
    .from("listings")
    .select(FEED_COLUMNS, { count: "exact" })
    .eq("status", "active");
  if (sellerIds) query = query.in("seller_id", sellerIds);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  // Page au-delà des résultats : PostgREST répond 416, on renvoie une liste vide.
  if (error && error.code !== "PGRST103") throw new ListingQueryError();

  const items = (data ?? []).map((row) => ({
    ...toListingCard(row),
    publishedAt: row.published_at,
    seller: row.seller
      ? {
          username: row.seller.username,
          displayName: row.seller.display_name,
          avatarPath: row.seller.avatar_path,
          verified: row.seller.verified_at !== null,
        }
      : null,
  }));
  return { items, total: count ?? 0, pageSize };
}
