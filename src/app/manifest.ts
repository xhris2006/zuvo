import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { defaultLocale, getDictionary } from "@/i18n";

/** Manifeste statique (application installée) : langue par défaut du site. */
export default function manifest(): MetadataRoute.Manifest {
  const t = getDictionary(defaultLocale);
  return {
    id: "/",
    name: `${siteConfig.name} — ${t.site.tagline}`,
    short_name: siteConfig.name,
    description: t.site.description,
    lang: defaultLocale,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f9fc",
    theme_color: siteConfig.themeColor,
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: t.pages.shortcutSell, url: routes.sell },
      { name: t.pages.shortcutMessages, url: routes.messages },
      { name: t.pages.shortcutExplore, url: routes.explore },
    ],
  };
}
