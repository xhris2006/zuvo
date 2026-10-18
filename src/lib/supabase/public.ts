import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout, getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import type { TypedSupabaseClient } from "./server";

/**
 * Client anonyme sans cookies, pour les données publiques mises en cache
 * (sitemap) : il ne voit que ce que RLS autorise aux visiteurs.
 */
export function createSupabasePublicClient(): TypedSupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
    db: { retry: false },
  });
}
