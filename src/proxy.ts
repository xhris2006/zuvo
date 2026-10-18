import { type NextRequest, NextResponse } from "next/server";
import { isGuestOnlyPath, isProtectedPath, routes } from "@/config/routes";
import { safeRedirectPath } from "@/features/auth/redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

/** Redirige en conservant les cookies de session éventuellement rafraîchis. */
function redirectWithCookies(url: URL, source: NextResponse) {
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === "cache-control") redirect.headers.set(key, value);
  });
  return redirect;
}

/**
 * Rafraîchit la session et effectue une redirection optimiste. Ce n'est
 * qu'une première barrière : chaque page et chaque action serveur vérifient
 * de nouveau l'utilisateur, et la base applique ses politiques RLS.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const authConfigured = getSupabaseConfig() !== null;

  if (authConfigured && !userId && isProtectedPath(pathname)) {
    const url = new URL(routes.signIn, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(url, response);
  }

  if (userId && isGuestOnlyPath(pathname)) {
    const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), routes.profile);
    return redirectWithCookies(new URL(next, request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    // Toutes les pages sauf les fichiers statiques et les images.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
