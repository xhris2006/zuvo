import "server-only";
import { createECDH } from "node:crypto";
import { publicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Version attendue de la base (dernière migration), voir public.app_schema_version(). */
export const EXPECTED_SCHEMA_VERSION = "20261021100000";

export type PushServerStatus = {
  supabase: boolean;
  schemaVersion: string | null;
  schemaUpToDate: boolean;
  serviceRoleKey: boolean;
  serviceRoleWorks: boolean;
  vapidPublicKey: boolean;
  vapidPrivateKey: boolean;
  vapidSubject: boolean;
  /** Les deux clés VAPID forment bien une paire (null si l'une manque). */
  vapidKeysMatch: boolean | null;
};

/** La clé publique correspond-elle à la clé privée ? (aucune valeur n'est renvoyée) */
export function vapidKeysMatch(publicKey: string, privateKey: string): boolean {
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    return ecdh.getPublicKey().toString("base64url") === publicKey;
  } catch {
    return false;
  }
}

/** État de la configuration (booléens uniquement, jamais de valeurs secrètes). */
export async function getPushServerStatus(): Promise<PushServerStatus> {
  let serverEnv: ReturnType<typeof getServerEnv> = {};
  try {
    serverEnv = getServerEnv();
  } catch {
    // Variable mal formée : traitée comme absente (le nom figure dans les journaux).
  }
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = serverEnv.VAPID_PRIVATE_KEY;

  const anon = createSupabasePublicClient();
  let schemaVersion: string | null = null;
  if (anon) {
    const { data } = await anon.rpc("app_schema_version");
    schemaVersion = typeof data === "string" ? data : null;
  }

  let serviceRoleWorks = false;
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true });
    serviceRoleWorks = !error;
  }

  return {
    supabase: anon !== null,
    schemaVersion,
    schemaUpToDate: schemaVersion !== null && schemaVersion >= EXPECTED_SCHEMA_VERSION,
    serviceRoleKey: Boolean(serverEnv.SUPABASE_SERVICE_ROLE_KEY),
    serviceRoleWorks,
    vapidPublicKey: Boolean(publicKey),
    vapidPrivateKey: Boolean(privateKey),
    vapidSubject: Boolean(serverEnv.VAPID_SUBJECT),
    vapidKeysMatch: publicKey && privateKey ? vapidKeysMatch(publicKey, privateKey) : null,
  };
}
