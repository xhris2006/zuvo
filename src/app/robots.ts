import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { getSiteUrl } from "@/lib/env";

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
        routes.signIn,
        routes.signUp,
        routes.settings,
        routes.feed,
        routes.admin,
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
