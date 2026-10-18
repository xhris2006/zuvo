import { Compass, House, type LucideIcon, MessageCircle, Plus, UserRound } from "lucide-react";
import type { Route } from "next";
import { routes } from "@/config/routes";
import type { Dictionary } from "@/i18n";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Correspondance exacte du chemin (sinon préfixe). */
  exact?: boolean;
  emphasis?: boolean;
};

export function getPrimaryNavItems(t: Dictionary): NavItem[] {
  return [
    { href: routes.home, label: t.nav.home, icon: House, exact: true },
    { href: routes.explore, label: t.nav.explore, icon: Compass },
    { href: routes.sell, label: t.nav.sell, icon: Plus, emphasis: true },
    { href: routes.messages, label: t.nav.messages, icon: MessageCircle },
    { href: routes.profile, label: t.nav.profile, icon: UserRound },
  ];
}

export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
