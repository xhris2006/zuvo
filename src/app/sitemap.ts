import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { getSiteUrl } from "@/lib/env";

/** Pages publiques statiques. Les annonces seront ajoutées avec la base de données. */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const pages = [
    { path: routes.home, priority: 1, changeFrequency: "daily" },
    { path: routes.explore, priority: 0.9, changeFrequency: "hourly" },
    { path: routes.safety, priority: 0.5, changeFrequency: "monthly" },
    { path: routes.help, priority: 0.4, changeFrequency: "monthly" },
    { path: routes.reportsInfo, priority: 0.3, changeFrequency: "monthly" },
    { path: routes.terms, priority: 0.2, changeFrequency: "yearly" },
    { path: routes.privacy, priority: 0.2, changeFrequency: "yearly" },
  ] as const;

  return pages.map((page) => ({
    url: `${siteUrl}${page.path === "/" ? "" : page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
