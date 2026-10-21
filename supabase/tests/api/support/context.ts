import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

/** Client Supabase dont les appels REST partent vers le PostgREST de test. */
function jwt(role: string, sub?: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    role,
    ...(sub ? { sub, aud: "authenticated" } : {}),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = createHmac("sha256", inject("jwtSecret"))
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

const BASE = "http://supabase.test";

/** Stockage simulé : listes vides, suppressions acceptées (aucun serveur Storage ici). */
export const storageCalls: Array<{ method: string; path: string; body?: string }> = [];

const routedFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  if (url.pathname.startsWith("/rest/v1")) {
    const target = `${inject("postgrestUrl")}${url.pathname.slice("/rest/v1".length)}${url.search}`;
    return fetch(target, init);
  }
  if (url.pathname.startsWith("/storage/v1")) {
    storageCalls.push({
      method: init?.method ?? "GET",
      path: url.pathname,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return Response.json([]);
  }
  return Response.json({ message: "non disponible dans les tests" }, { status: 501 });
};

function client(token: string): TypedSupabaseClient {
  return createClient<Database>(BASE, token, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: routedFetch },
    db: { retry: false },
  });
}

export type ApiUser = { id: string; email: string };

/** État courant, lu par les modules simulés (session, clients Supabase). */
export const api = {
  user: null as ApiUser | null,
  client: null as TypedSupabaseClient | null,
  anon: null as TypedSupabaseClient | null,
  service: null as TypedSupabaseClient | null,
};

/** Agit comme un visiteur (null) ou comme l'utilisateur indiqué. */
export function actAs(user: { id: string } | null) {
  api.anon = client(jwt("anon"));
  api.service = client(jwt("service_role"));
  api.user = user ? { id: user.id, email: `${user.id}@example.test` } : null;
  api.client = user ? client(jwt("authenticated", user.id)) : api.anon;
}
