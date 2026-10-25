import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { shopQueryTokens } from "./shop-search";

export type ShopSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  city: string | null;
  /** Annonces actuellement en vente. */
  activeListings: number;
};

export type ShopSearchResult = { items: ShopSummary[]; total: number; pageSize: number };

class ShopQueryError extends Error {
  constructor() {
    super("shop_query_failed");
  }
}

const SHOP_COLUMNS = "id, username, display_name, avatar_path, city";

type ShopSearchOptions = { q?: string; page?: number; pageSize?: number };

/**
 * Boutiques (profils publics non suspendus) par nom ou pseudo, avec leur
 * nombre d'annonces en vente. Sans terme de recherche : uniquement les
 * profils qui ont au moins une annonce en vente.
 */
export async function searchShops({
  q = "",
  page = 1,
  pageSize = 24,
}: ShopSearchOptions = {}): Promise<ShopSearchResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0, pageSize };

  const tokens = shopQueryTokens(q);
  // Alias distincts : le filtre de statut s'applique à chaque jointure séparément.
  const columns = `${SHOP_COLUMNS}, on_sale:listings!listings_seller_id_fkey(count)`;
  let query =
    tokens.length > 0
      ? supabase.from("profiles").select(columns, { count: "exact" })
      : // Sans recherche, la jointure interne écarte les profils sans annonce en vente.
        supabase
          .from("profiles")
          .select(`${columns}, has_sale:listings!listings_seller_id_fkey!inner(id)`, {
            count: "exact",
          })
          .eq("has_sale.status", "active")
          .limit(1, { referencedTable: "has_sale" });
  // Comptes suspendus exclus (une suspension temporaire expirée n'en est plus une).
  query = query
    .or(`suspended_at.is.null,suspended_until.lte.${new Date().toISOString()}`)
    .eq("on_sale.status", "active");
  // Mots nettoyés (lettres, chiffres, point, tiret) : sans danger dans `.or(...)`.
  for (const token of tokens) {
    query = query.or(`display_name.ilike.%${token}%,username.ilike.%${token}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("display_name")
    .order("username")
    .range(from, from + pageSize - 1);
  // Page au-delà des résultats : PostgREST répond 416, on renvoie une liste vide.
  if (error && error.code !== "PGRST103") throw new ShopQueryError();

  const items = (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarPath: row.avatar_path,
    city: row.city,
    activeListings: row.on_sale[0]?.count ?? 0,
  }));
  return { items, total: count ?? 0, pageSize };
}
