import "server-only";
import { createECDH } from "node:crypto";
import { publicEnv } from "@/lib/env";
import { getInvalidServerEnv, getServerEnv } from "@/lib/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Version attendue de la base (dernière migration), voir public.app_schema_version(). */
export const EXPECTED_SCHEMA_VERSION = "20261025100100";

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
  /** Variables serveur définies mais mal formées (noms seulement). */
  invalidVariables: string[];
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
  const serverEnv = getServerEnv();
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
    invalidVariables: getInvalidServerEnv(),
  };
}

export type PushActivity = {
  /** Notifications des dernières 24 h jamais traitées par l'envoi push. */
  pending: number;
  recent: {
    id: string;
    type: string;
    pushedAt: string;
    status: string | null;
    detail: string | null;
  }[];
};

/**
 * Derniers envois push (type, date, résultat), sans destinataire ni contenu.
 * Lecture en service_role : à n'appeler qu'après requireAdmin().
 */
export async function getPushActivity(): Promise<PushActivity | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count }, { data, error }] = await Promise.all([
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("pushed_at", null)
      .gte("created_at", since),
    admin
      .from("notifications")
      .select("id, type, pushed_at, push_status, push_detail")
      .not("pushed_at", "is", null)
      .order("pushed_at", { ascending: false })
      .limit(15),
  ]);
  if (error) return null;
  return {
    pending: count ?? 0,
    recent: (data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      pushedAt: row.pushed_at!,
      status: row.push_status,
      detail: row.push_detail,
    })),
  };
}
