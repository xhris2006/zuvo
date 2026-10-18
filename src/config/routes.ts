import type { Route } from "next";

/** Chemins de l'application, centralisés pour pouvoir les renommer facilement. */
export const routes = {
  home: "/",
  explore: "/explorer",
  sell: "/vendre",
  messages: "/messages",
  profile: "/profil",
  favorites: "/favoris",
  notifications: "/notifications",
  signIn: "/connexion",
  signUp: "/inscription",
  terms: "/conditions",
  privacy: "/confidentialite",
  safety: "/securite",
  help: "/aide",
  reportsInfo: "/signalements",
} as const satisfies Record<string, Route>;

/** Lien vers la page Explorer avec des paramètres de recherche. */
export function exploreHref(params?: URLSearchParams): Route {
  const query = params?.toString();
  return (query ? `${routes.explore}?${query}` : routes.explore) as Route;
}
