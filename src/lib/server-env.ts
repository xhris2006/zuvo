import "server-only";
import { z } from "zod";

/**
 * Secrets lus uniquement côté serveur. Ce module ne doit jamais être importé
 * par un composant client (garanti par « server-only »), et aucune valeur
 * n'est journalisée.
 */
const schemas = {
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().regex(/^[A-Za-z0-9_-]{40,50}$/),
  VAPID_SUBJECT: z.string().regex(/^(mailto:|https:\/\/)\S+$/),
};

type ServerEnvName = keyof typeof schemas;

export type ServerEnv = Partial<Record<ServerEnvName, string>>;

export type ParsedServerEnv = {
  env: ServerEnv;
  /** Variables définies mais mal formées (noms seulement, jamais les valeurs). */
  invalid: ServerEnvName[];
};

/**
 * Corrige les erreurs de copier-coller courantes : espaces ou retour à la
 * ligne en trop, guillemets autour de la valeur, adresse e-mail sans
 * « mailto: » pour le contact VAPID.
 */
function normalize(name: ServerEnvName, raw: string): string {
  let value = raw.trim();
  const quoted = /^(["'])(.*)\1$/s.exec(value);
  if (quoted) value = quoted[2]!.trim();
  if (name === "VAPID_SUBJECT" && /^[^\s@:/]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    value = `mailto:${value}`;
  }
  return value;
}

/** Chaque variable est validée séparément : une erreur n'en désactive pas d'autres. */
export function parseServerEnv(source: Record<string, string | undefined>): ParsedServerEnv {
  const env: ServerEnv = {};
  const invalid: ServerEnvName[] = [];
  for (const name of Object.keys(schemas) as ServerEnvName[]) {
    const raw = source[name];
    if (raw === undefined) continue;
    const value = normalize(name, raw);
    if (value === "") continue;
    if (schemas[name].safeParse(value).success) env[name] = value;
    else invalid.push(name);
  }
  return { env, invalid };
}

let cached: ParsedServerEnv | undefined;

function load(): ParsedServerEnv {
  cached ??= parseServerEnv({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  });
  if (cached.invalid.length > 0) {
    // Seuls les noms sont indiqués, jamais les valeurs.
    console.error(`Variables d'environnement serveur invalides : ${cached.invalid.join(", ")}`);
  }
  return cached;
}

/** Variables valides uniquement ; une variable mal formée est traitée comme absente. */
export function getServerEnv(): ServerEnv {
  return load().env;
}

/** Noms des variables définies mais mal formées (page de configuration). */
export function getInvalidServerEnv(): ServerEnvName[] {
  return load().invalid;
}
