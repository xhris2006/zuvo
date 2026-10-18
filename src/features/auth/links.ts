import type { Route } from "next";
import { routes } from "@/config/routes";

/** Lien vers la connexion avec retour à la page demandée. */
export function signInHref(returnTo?: string): Route {
  if (!returnTo || returnTo === routes.home) return routes.signIn;
  return `${routes.signIn}?next=${encodeURIComponent(returnTo)}` as Route;
}
