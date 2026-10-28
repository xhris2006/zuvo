import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export type ProfileTab = {
  key: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
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
 * Onglets d'un profil, sur toute la largeur : icône, libellé et nombre ;
 * l'onglet actif est souligné en orange. L'onglet actif est le titre (h2) de
 * la section, les autres sont des liens vers leur page : aucun JavaScript.
 */
export async function ProfileTabs({ tabs, labelledBy, trailing, className }: ProfileTabsProps) {
  const t = await getT();
  const hasLinks = tabs.some((tab) => !tab.current);
  const list = (
    <ul
      className="grid min-w-0 flex-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const content = (
          <>
            {Icon ? <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" /> : null}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "inline-flex min-w-5 shrink-0 justify-center rounded-full px-1.5 text-xs font-semibold",
                  tab.current ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                {t.format.count(tab.count)}
              </span>
            ) : null}
          </>
        );
        const base =
          "-mb-px flex h-11 items-center justify-center gap-1.5 border-b-2 px-2 text-sm whitespace-nowrap";
        return (
          <li key={tab.key} className="min-w-0">
            {tab.current ? (
              <h2
                id={labelledBy}
                className={cn(base, "border-primary-line font-semibold text-foreground")}
              >
                {content}
              </h2>
            ) : (
              <Link
                href={tab.href}
                className={cn(
                  base,
                  "border-transparent font-medium text-muted-foreground transition-colors hover:text-foreground",
                )}
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
    <div className={cn("flex items-end gap-3 border-b border-border", className)}>
      {hasLinks ? (
        <nav aria-label={t.profile.tabsLabel} className="flex min-w-0 flex-1">
          {list}
        </nav>
      ) : (
        list
      )}
      {trailing ? <div className="shrink-0 pb-1.5">{trailing}</div> : null}
    </div>
  );
}
