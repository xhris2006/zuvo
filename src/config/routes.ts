import type { Route } from "next";

/** Chemins de l'application, centralisés pour pouvoir les renommer facilement. */
export const routes = {
  home: "/",
  explore: "/explorer",
  sell: "/vendre",
  messages: "/messages",
  profile: "/profil",
  editProfile: "/profil/modifier",
  settings: "/parametres",
  favorites: "/favoris",
  feed: "/fil",
  notifications: "/notifications",
  signIn: "/connexion",
  signUp: "/inscription",
  signUpCheckEmail: "/inscription/verification",
  forgotPassword: "/mot-de-passe-oublie",
  resetPassword: "/reinitialiser-mot-de-passe",
  authConfirm: "/auth/confirm",
  authCallback: "/auth/callback",
  terms: "/conditions",
  privacy: "/confidentialite",
  safety: "/securite",
  help: "/aide",
  reportsInfo: "/signalements",
  offline: "/hors-ligne",
  admin: "/admin",
  adminReports: "/admin/signalements",
  adminUsers: "/admin/utilisateurs",
  adminLog: "/admin/journal",
  adminConfig: "/admin/configuration",
  adminListings: "/admin/annonces",
  adminCategories: "/admin/categories",
  adminCities: "/admin/villes",
  adminTeam: "/admin/equipe",
  adminAnnouncements: "/admin/message",
  adminAntiSpam: "/admin/anti-spam",
  adminSupport: "/admin/assistance",
  support: "/assistance",
} as const satisfies Record<string, Route>;

/** Pages réservées aux utilisateurs connectés (préfixes). */
export const protectedRoutePrefixes = [
  routes.sell,
  routes.messages,
  routes.profile,
  routes.settings,
  routes.favorites,
  routes.feed,
  routes.notifications,
  routes.resetPassword,
  routes.admin,
  routes.support,
] as const;

/** Pages d'authentification inutiles une fois connecté. */
export const guestOnlyRoutes = [routes.signIn, routes.signUp, routes.forgotPassword] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return protectedRoutePrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return guestOnlyRoutes.some((route) => pathname === route);
}

/** Lien vers la page Explorer avec des paramètres de recherche. */
export function exploreHref(params?: URLSearchParams): Route {
  const query = params?.toString();
  return (query ? `${routes.explore}?${query}` : routes.explore) as Route;
}

/** Profil public d'un utilisateur. */
export function publicProfileHref(username: string): Route {
  return `/u/${encodeURIComponent(username)}` as Route;
}

export function followersHref(username: string): Route {
  return `/u/${encodeURIComponent(username)}/abonnes` as Route;
}

/** Fiche d'un utilisateur dans l'administration. */
export function adminUserHref(userId: string): Route {
  return `/admin/utilisateurs/${encodeURIComponent(userId)}` as Route;
}

export function followingHref(username: string): Route {
  return `/u/${encodeURIComponent(username)}/abonnements` as Route;
}
