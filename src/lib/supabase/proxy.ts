import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout, getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Rafraîchit la session Supabase à chaque requête et renvoie la réponse
 * portant les cookies mis à jour, ainsi que l'identifiant de l'utilisateur
 * (jeton vérifié par getClaims, jamais lu sans vérification).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return { response, userId: null };

  const supabase = createServerClient<Database>(config.url, config.key, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // En-têtes anti-cache : une réponse portant une session ne doit
        // jamais être mise en cache par un CDN.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Ne rien exécuter entre la création du client et getClaims() : c'est cet
  // appel qui rafraîchit la session si nécessaire.
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { response, userId };
}
