import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { getSiteUrl } from "@/lib/env";

/**
 * Pages publiques ouvertes à l'exploration ; espaces membres, administration,
 * authentification et API exclus. Ce n'est pas une protection : ces pages
 * exigent une session (src/proxy.ts) et la base applique ses politiques RLS.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
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
        routes.support,
        routes.admin,
        routes.signIn,
        routes.signUp,
        routes.forgotPassword,
        routes.resetPassword,
        routes.offline,
        "/auth/",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
