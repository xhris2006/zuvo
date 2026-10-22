/*
 * Variables d'environnement publiques (exposées au navigateur). Validation
 * volontairement sans bibliothèque : ce module est chargé sur toutes les
 * pages, côté client compris.
 */

type Validator = (value: string) => boolean;

const isHttpUrl: Validator = (value) => {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === "https:" || protocol === "http:";
};

const rules = {
  NEXT_PUBLIC_SITE_URL: isHttpUrl,
  NEXT_PUBLIC_CONTACT_EMAIL: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  NEXT_PUBLIC_SUPABASE_URL: isHttpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: (value) => value.trim().length > 0,
  // Clé publique VAPID (Web Push), encodée en base64url : elle peut être
  // exposée au navigateur. La clé privée reste côté serveur (server-env.ts).
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: (value) => /^[A-Za-z0-9_-]{80,100}$/.test(value),
} satisfies Record<string, Validator>;

type PublicEnvName = keyof typeof rules;

export type PublicEnv = Partial<Record<PublicEnvName, string>>;

/** Les chaînes vides issues d'un fichier .env sont traitées comme absentes. */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const env: PublicEnv = {};
  const invalid: string[] = [];
  for (const name of Object.keys(rules) as PublicEnvName[]) {
    // Espaces et guillemets copiés par erreur autour de la valeur sont ignorés.
    const value = source[name]
      ?.trim()
      .replace(/^(["'])(.*)\1$/s, "$2")
      .trim();
    if (value === undefined || value === "") continue;
    if (rules[name](value)) env[name] = value;
    else invalid.push(name);
  }
  if (invalid.length > 0) {
    // Seuls les noms sont indiqués, jamais les valeurs.
    throw new Error(`Variables d'environnement publiques invalides : ${invalid.join(", ")}`);
  }
  return env;
}

// Les variables NEXT_PUBLIC_* doivent être lues littéralement pour être
// injectées dans le bundle client par Next.js.
export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

export function isSupabaseConfigured(env: PublicEnv = publicEnv): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/** URL absolue du site, sans slash final. */
export function getSiteUrl(env: PublicEnv = publicEnv): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction}`;
  return "http://localhost:3000";
}
