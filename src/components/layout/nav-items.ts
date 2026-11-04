import { Compass, House, type LucideIcon, MessageCircle, Plus, UserRound } from "lucide-react";
import type { Route } from "next";
import { routes } from "@/config/routes";
import type { Space } from "@/features/services/space";
import type { Dictionary } from "@/i18n";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Correspondance exacte du chemin (sinon préfixe). */
  exact?: boolean;
  emphasis?: boolean;
  /** Compteur de non-lus affiché sur l'icône. */
  badge?: "messages" | "notifications";
};

/**
 * Rubriques principales. Dans l'espace Services, l'accueil, l'exploration et
 * le bouton central mènent à leurs équivalents « services », aux mêmes places.
 */
export function getPrimaryNavItems(t: Dictionary, space: Space = "marketplace"): NavItem[] {
  const services = space === "services";
  return [
    { href: services ? routes.services : routes.home, label: t.nav.home, icon: House, exact: true },
    {
      href: services ? routes.servicesSearch : routes.explore,
      label: t.nav.explore,
      icon: Compass,
    },
    {
      href: services ? routes.publishService : routes.sell,
      label: services ? t.nav.publishService : t.nav.sell,
      icon: Plus,
      emphasis: true,
    },
    { href: routes.messages, label: t.nav.messages, icon: MessageCircle, badge: "messages" },
    { href: routes.profile, label: t.nav.profile, icon: UserRound },
  ];
}

export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
