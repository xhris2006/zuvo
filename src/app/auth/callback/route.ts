import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { routes } from "@/config/routes";
import { safeRedirectPath } from "@/features/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Retour de la connexion Google et des liens e-mail au format PKCE : échange
 * le code contre une session puis redirige vers la page demandée.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();
  if (supabase && code && code.length <= 512) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }
  redirect(`${routes.signIn}?erreur=connexion-echouee`);
}
