import { z } from "zod";

/** Les chaînes vides issues d'un fichier .env sont traitées comme absentes. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optional(z.url()),
  NEXT_PUBLIC_CONTACT_EMAIL: optional(z.email()),
  NEXT_PUBLIC_SUPABASE_URL: optional(z.url()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional(z.string().min(1)),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const invalid = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables d'environnement publiques invalides : ${invalid}`);
  }
  return result.data;
}

// Les variables NEXT_PUBLIC_* doivent être lues littéralement pour être
// injectées dans le bundle client par Next.js.
export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
