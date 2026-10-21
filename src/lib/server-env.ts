import "server-only";
import { z } from "zod";

/**
 * Secrets lus uniquement côté serveur. Ce module ne doit jamais être importé
 * par un composant client (garanti par « server-only »), et aucune valeur
 * n'est journalisée.
 */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optional(z.string().min(20)),
  VAPID_PRIVATE_KEY: optional(z.string().regex(/^[A-Za-z0-9_-]{40,50}$/)),
  VAPID_SUBJECT: optional(z.string().regex(/^(mailto:|https:\/\/)\S+$/)),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Seuls les noms des variables invalides sont indiqués, jamais leurs valeurs.
    const invalid = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables d'environnement serveur invalides : ${invalid}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  });
  return cached;
}
