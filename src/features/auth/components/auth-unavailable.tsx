import { Alert } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/i18n/server";

/**
 * Message affiché tant que l'authentification n'est pas opérationnelle.
 * En développement, il rappelle les variables d'environnement manquantes.
 */
export async function AuthUnavailable() {
  const t = await getT();
  const showSetupHint = process.env.NODE_ENV !== "production" && !isSupabaseConfigured();
  return (
    <Alert variant="info" title={t.auth.notConfiguredTitle}>
      <p>{t.auth.notConfiguredBody}</p>
      {showSetupHint ? (
        <p className="mt-2 text-xs">
          {t.authForms.devSetupHint} <code>NEXT_PUBLIC_SUPABASE_URL</code> {t.authForms.devSetupAnd}{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> {t.authForms.devSetupIn}{" "}
          <code>.env.local</code> {t.authForms.devSetupSee}
        </p>
      ) : null}
    </Alert>
  );
}
