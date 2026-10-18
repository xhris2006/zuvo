import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** L'utilisateur connecté a-t-il bloqué cet utilisateur ? */
export async function hasBlocked(viewerId: string, otherId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { count } = await supabase
    .from("blocks")
    .select("blocked_id", { count: "exact", head: true })
    .eq("blocker_id", viewerId)
    .eq("blocked_id", otherId);
  return (count ?? 0) > 0;
}

export type BlockedUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
  blockedAt: string;
};

/** Utilisateurs bloqués par l'utilisateur connecté (RLS : ses propres blocages). */
export async function getBlockedUsers(viewerId: string): Promise<BlockedUser[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("blocks")
    .select(
      "blocked_id, created_at, profile:profiles!blocks_blocked_id_fkey(username, display_name, avatar_path)",
    )
    .eq("blocker_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({
    id: row.blocked_id,
    username: row.profile?.username ?? null,
    displayName: row.profile?.display_name ?? null,
    avatarPath: row.profile?.avatar_path ?? null,
    blockedAt: row.created_at,
  }));
}
