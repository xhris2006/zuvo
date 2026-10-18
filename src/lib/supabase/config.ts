import { type PublicEnv, publicEnv } from "@/lib/env";

export type SupabaseConfig = { url: string; key: string };

/** Configuration publique de Supabase, ou null tant qu'elle n'est pas renseignée. */
export function getSupabaseConfig(env: PublicEnv = publicEnv): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** URL publique d'un fichier d'un bucket public (avatars, photos d'annonces). */
export function publicStorageUrl(bucket: string, path: string, env: PublicEnv = publicEnv) {
  const config = getSupabaseConfig(env);
  if (!config) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${config.url}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

/** Délai maximal d'une requête vers Supabase avant abandon. */
export const SUPABASE_REQUEST_TIMEOUT_MS = 10_000;

/**
 * fetch avec délai maximal : une panne de Supabase ne doit pas bloquer
 * indéfiniment le rendu des pages.
 */
export const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};
