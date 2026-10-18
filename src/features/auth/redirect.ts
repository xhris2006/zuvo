import type { Route } from "next";
import { routes } from "@/config/routes";

const ORIGIN = "http://zuvo.invalid";
const disallowedTargets = [routes.signIn, routes.signUp, "/auth"];

/**
 * Valide une destination de redirection fournie par l'utilisateur (paramètre
 * `next`). Seuls les chemins internes sont acceptés : toute URL absolue,
 * protocole relatif (//), barre oblique inverse ou caractère de contrôle est
 * rejeté pour empêcher les redirections ouvertes.
 */
export function safeRedirectPath(value: unknown, fallback: string = routes.home): Route {
  const fallbackRoute = fallback as Route;
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallbackRoute;
  if (!value.startsWith("/") || value.startsWith("//")) return fallbackRoute;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallbackRoute;

  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return fallbackRoute;
  }
  if (url.origin !== ORIGIN) return fallbackRoute;
  if (
    disallowedTargets.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))
  ) {
    return fallbackRoute;
  }
  return `${url.pathname}${url.search}${url.hash}` as Route;
}
