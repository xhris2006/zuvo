import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/features/auth/session";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type PublicProfile = Pick<
  ProfileRow,
  "id" | "username" | "display_name" | "avatar_path" | "bio" | "city" | "created_at"
>;

export type ProfileStats = {
  followers: number;
  following: number;
  activeListings: number;
};

const PUBLIC_COLUMNS = "id, username, display_name, avatar_path, bio, city, created_at";

/** Erreur d'accès aux données : affichée par la page d'erreur, jamais en détail. */
class ProfileQueryError extends Error {
  constructor() {
    super("profile_query_failed");
  }
}

/** Profil public par nom d'utilisateur ; null s'il n'existe pas (ou est masqué). */
export const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("username", username)
    .maybeSingle();
  if (error) throw new ProfileQueryError();
  return data satisfies PublicProfile | null;
});

export const getProfileById = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ProfileQueryError();
  return data satisfies PublicProfile | null;
});

/**
 * Profil de l'utilisateur connecté (en-tête, menus). Une indisponibilité
 * temporaire ne doit pas empêcher l'affichage du reste du site.
 */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await getProfileById(user.id);
  } catch {
    return null;
  }
});

/** Compteurs réels (abonnés, abonnements, annonces en vente). */
export async function getProfileStats(profileId: string): Promise<ProfileStats> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { followers: 0, following: 0, activeListings: 0 };

  const [followers, following, listings] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profileId),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", profileId)
      .eq("status", "active"),
  ]);

  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    activeListings: listings.count ?? 0,
  };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { count } = await supabase
    .from("follows")
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return (count ?? 0) > 0;
}

/** Coordonnées privées de l'utilisateur connecté (RLS : propriétaire uniquement). */
export async function getOwnPrivateContact(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profile_private")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();
  return data;
}
