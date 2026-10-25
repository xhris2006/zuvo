import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export type ProfileTab = {
  key: string;
  label: string;
  count?: number;
} & ({ current: true; href?: never } | { current?: false; href: Route });

type ProfileTabsProps = {
  tabs: readonly ProfileTab[];
  /** Identifiant du titre de l'onglet actif (cible de `aria-labelledby` de la section). */
  labelledBy: string;
  /** Contenu aligné à droite (ex. bouton « Vendre »). */
  trailing?: ReactNode;
  className?: string;
};

/**
 * Onglets d'un profil. L'onglet actif est le titre (h2) de la section, les
 * autres sont des liens vers leur page : aucun JavaScript nécessaire.
 */
export async function ProfileTabs({ tabs, labelledBy, trailing, className }: ProfileTabsProps) {
  const t = await getT();
  const hasLinks = tabs.some((tab) => !tab.current);
  const list = (
    <ul className="flex min-w-0 items-end gap-5 sm:gap-6">
      {tabs.map((tab) => {
        const content = (
          <>
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "ml-2 inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 align-middle text-xs font-semibold",
                  tab.current ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                {t.format.count(tab.count)}
              </span>
            ) : null}
          </>
        );
        return (
          <li key={tab.key} className="-mb-px">
            {tab.current ? (
              <h2
                id={labelledBy}
                className="border-b-2 border-foreground pb-2.5 text-sm font-semibold tracking-tight whitespace-nowrap sm:text-base"
              >
                {content}
              </h2>
            ) : (
              <Link
                href={tab.href}
                className="block border-b-2 border-transparent pb-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-border hover:text-foreground sm:text-base"
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={cn("flex items-end justify-between gap-4 border-b border-border", className)}>
      {hasLinks ? <nav aria-label={t.profile.tabsLabel}>{list}</nav> : list}
      {trailing ? <div className="shrink-0 pb-2">{trailing}</div> : null}
    </div>
  );
}
