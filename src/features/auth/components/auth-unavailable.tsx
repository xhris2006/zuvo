import { Alert } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env";
import { getDictionary } from "@/i18n";

/**
 * Message affiché tant que l'authentification n'est pas opérationnelle.
 * En développement, il rappelle les variables d'environnement manquantes.
 */
export function AuthUnavailable() {
  const t = getDictionary();
  const showSetupHint = process.env.NODE_ENV !== "production" && !isSupabaseConfigured();
  return (
    <Alert variant="info" title={t.auth.notConfiguredTitle}>
      <p>{t.auth.notConfiguredBody}</p>
      {showSetupHint ? (
        <p className="mt-2 text-xs">
          Développement : renseignez <code>NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> dans <code>.env.local</code> (voir le
          README).
        </p>
      ) : null}
    </Alert>
  );
}
