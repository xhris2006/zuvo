import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { getPublicSiteUrl } from "@/lib/env";

/**
 * Pages publiques ouvertes à l'exploration ; espaces membres,
 * administration, retours d'authentification et API exclus. Ce n'est pas une
 * protection : ces pages exigent une session (src/proxy.ts) et la base
 * applique ses politiques RLS.
 *
 * Les formulaires de connexion, d'inscription et de mot de passe oublié
 * restent explorables : ils portent la balise `noindex`, que les moteurs ne
 * peuvent lire que s'ils ont le droit d'ouvrir la page (une page bloquée ici
 * peut au contraire être indexée sans son contenu à partir des liens).
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        routes.messages,
        routes.profile,
        routes.favorites,
        routes.notifications,
        routes.sell,
        routes.settings,
        routes.feed,
        routes.publishService,
        routes.myServices,
        "/services/*/modifier",
        "/annonces/*/modifier",
        routes.support,
        routes.admin,
        routes.resetPassword,
        routes.offline,
        "/auth/",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
