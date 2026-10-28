import "server-only";
import { getCategories } from "@/features/listings/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { suggestMembers } from "@/features/profiles/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { foldText, rankTitles } from "./suggestion-text";
import { buildPrefixTsQuery } from "./text-query";

export type SearchSuggestions = {
  /** Titres d'annonces en vente, à relancer comme recherche. */
  queries: string[];
  categories: { slug: string; name: string }[];
  members: { username: string; displayName: string; avatarUrl: string | null; verified: boolean }[];
};

export const noSuggestions: SearchSuggestions = { queries: [], categories: [], members: [] };

async function suggestTitles(q: string): Promise<string[]> {
  const tsQuery = buildPrefixTsQuery(q);
  const supabase = await createSupabaseServerClient();
  if (!tsQuery || !supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("title")
    .eq("status", "active")
    .textSearch("search_vector", tsQuery, { config: "french_unaccent" })
    .order("published_at", { ascending: false })
    .limit(15);
  if (error) return [];
  return rankTitles(
    q,
    data.map((row) => row.title),
    5,
  );
}

async function suggestCategories(q: string) {
  const typed = foldText(q).trim();
  const categories = await getCategories().catch(() => []);
  // Début du nom ou d'un de ses mots : « ro » ne propose pas « Électroménager ».
  return categories
    .filter((category) => {
      const name = foldText(category.name);
      return (
        name.startsWith(typed) ||
        name.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(typed))
      );
    })
    .slice(0, 3)
    .map(({ slug, name }) => ({ slug, name }));
}

/**
 * Suggestions de la barre de recherche : annonces en vente, catégories et
 * membres (avec ou sans annonce). Lecture avec la session de l'utilisateur :
 * les règles d'accès de la base s'appliquent. Une source en panne n'empêche
 * pas les autres de répondre.
 */
export async function getSearchSuggestions(q: string): Promise<SearchSuggestions> {
  const [queries, categories, members] = await Promise.all([
    suggestTitles(q),
    suggestCategories(q),
    suggestMembers(q, 4).catch(() => []),
  ]);
  return {
    queries,
    categories,
    members: members.map((member) => ({
      username: member.username,
      displayName: member.displayName,
      avatarUrl: avatarUrl(member.avatarPath),
      verified: member.verified,
    })),
  };
}
