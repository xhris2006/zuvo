import type { Route } from "next";
import Link from "next/link";
import { exploreHref } from "@/config/routes";
import type { ExploreTab } from "@/features/profiles/shop-search";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";

/** Lien vers un onglet d'Explorer en conservant le terme recherché. */
export function exploreTabHref(tab: ExploreTab, query?: string): Route {
  const params = new URLSearchParams();
  if (tab === "boutiques") params.set("type", "boutiques");
  if (query) params.set("q", query);
  return exploreHref(params);
}

type ExploreTabsProps = {
  current: ExploreTab;
  /** Terme recherché, repris dans l'autre onglet. */
  query?: string;
  className?: string;
};

/** Onglets « Articles | Boutiques » de la page Explorer (liens, sans JavaScript). */
export function ExploreTabs({ current, query, className }: ExploreTabsProps) {
  const t = getDictionary();
  const tabs = [
    { tab: "articles", label: t.explore.tabArticles },
    { tab: "boutiques", label: t.explore.tabShops },
  ] as const;
  return (
    <nav aria-label={t.explore.tabsLabel} className={className}>
      <ul className="flex w-full rounded-full bg-muted p-1 sm:inline-flex sm:w-auto">
        {tabs.map(({ tab, label }) => {
          const active = tab === current;
          return (
            <li key={tab} className="flex flex-1 sm:flex-none">
              <Link
                href={exploreTabHref(tab, query)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
