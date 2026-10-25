"use client";

import {
  Building2,
  ClipboardList,
  Flag,
  FolderTree,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Megaphone,
  Package,
  Settings2,
  ShieldBan,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

type Item = { href: Route; label: string; icon: LucideIcon; exact?: boolean };

const moderation: Item[] = [
  { href: routes.admin, label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: routes.adminReports, label: "Signalements", icon: Flag },
  { href: routes.adminListings, label: "Annonces", icon: Package },
  { href: routes.adminUsers, label: "Utilisateurs", icon: Users },
  { href: routes.adminSupport, label: "Assistance", icon: LifeBuoy },
  { href: routes.adminLog, label: "Journal", icon: ClipboardList },
];

const administration: Item[] = [
  { href: routes.adminTeam, label: "Équipe", icon: ShieldCheck },
  { href: routes.adminCategories, label: "Catégories", icon: FolderTree },
  { href: routes.adminCities, label: "Villes", icon: Building2 },
  { href: routes.adminAnnouncements, label: "Message global", icon: Megaphone },
  { href: routes.adminAntiSpam, label: "Anti-spam", icon: ShieldBan },
  { href: routes.adminConfig, label: "Configuration", icon: Settings2 },
];

/**
 * Navigation de l'administration : onglets défilants sur mobile, colonne
 * latérale sur ordinateur. Les modérateurs ne voient que la modération.
 */
export function AdminNav({ role }: { role: "admin" | "moderator" }) {
  const pathname = usePathname();
  const groups = role === "admin" ? [moderation, administration] : [moderation];
  const isActive = (item: Item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav aria-label="Administration" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 border-b border-border lg:flex-col lg:gap-0.5 lg:border-0">
        {groups.map((items, index) => (
          <li key={index} className="contents lg:block">
            {index > 0 ? (
              <p className="hidden px-3 pt-5 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">
                Administration
              </p>
            ) : (
              <p className="hidden px-3 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">
                Modération
              </p>
            )}
            <ul className="contents lg:flex lg:flex-col lg:gap-0.5">
              {items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors lg:mb-0 lg:flex lg:h-10 lg:w-full lg:rounded-xl lg:border-b-0",
                        active
                          ? "border-primary text-primary lg:bg-primary/10"
                          : "border-transparent text-muted-foreground hover:text-foreground lg:hover:bg-muted",
                      )}
                    >
                      <Icon className="hidden size-4 shrink-0 lg:block" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
