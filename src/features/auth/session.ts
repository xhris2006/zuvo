import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient, type TypedSupabaseClient } from "@/lib/supabase/server";
import { signInHref } from "./links";

export type SessionUser = {
  id: string;
  email: string | null;
};

/**
 * Utilisateur connecté pour la requête en cours (jeton vérifié), ou null.
 * Mis en cache pour la durée du rendu.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
});

/**
 * Exige un utilisateur connecté : redirige vers la connexion sinon.
 * À appeler dans chaque page et chaque action serveur réservée aux membres.
 */
export async function requireUser(returnTo: string): Promise<{
  user: SessionUser;
  supabase: TypedSupabaseClient;
}> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) redirect(signInHref(returnTo));
  return { user, supabase };
}
