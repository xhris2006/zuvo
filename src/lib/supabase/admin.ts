import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/server-env";
import { fetchWithTimeout, getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import type { TypedSupabaseClient } from "./server";

/**
 * Client Supabase « service_role » : contourne RLS. Réservé aux traitements
 * serveur qui ne peuvent pas agir au nom d'un utilisateur (envoi des
 * notifications push, suppression de compte). Ne jamais l'utiliser pour
 * répondre directement à une requête sans vérifier l'autorisation.
 */
export function createSupabaseAdminClient(): TypedSupabaseClient | null {
  const config = getSupabaseConfig();
  const serviceKey = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) return null;
  return createClient<Database>(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
    db: { retry: false },
  });
}
