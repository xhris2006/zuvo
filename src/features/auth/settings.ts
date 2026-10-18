import "server-only";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AuthSettings = {
  googleEnabled: boolean;
  signupEnabled: boolean;
};

const settingsSchema = z.object({
  external: z.record(z.string(), z.boolean()).optional(),
  disable_signup: z.boolean().optional(),
});

/**
 * Lit la configuration publique de Supabase Auth (fournisseurs activés) afin
 * de n'afficher le bouton Google que s'il est réellement configuré.
 */
export async function getAuthSettings(): Promise<AuthSettings | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const parsed = settingsSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    return {
      googleEnabled: parsed.data.external?.google === true,
      signupEnabled: parsed.data.disable_signup !== true,
    };
  } catch {
    return null;
  }
}
