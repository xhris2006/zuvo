import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { fetchWithTimeout, getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route
 * Handlers), lié aux cookies de session de la requête. Retourne null si
 * Supabase n'est pas configuré.
 */
export async function createSupabaseServerClient(): Promise<TypedSupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : les cookies ne sont pas
          // modifiables ici. Le proxy se charge de rafraîchir la session.
        }
      },
    },
  });
}
