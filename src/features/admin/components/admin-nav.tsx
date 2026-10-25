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
  Menu,
  Package,
  Settings2,
  ShieldBan,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type MouseEvent, useState } from "react";
import { routes } from "@/config/routes";
import type { Dictionary } from "@/i18n";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Item = { href: Route; label: string; icon: LucideIcon; exact?: boolean };
type Group = { title: string; items: Item[] };

function navGroups(t: Dictionary): { moderation: Group; administration: Group } {
  const nav = t.adminUi.nav;
  return {
    moderation: {
      title: nav.moderation,
      items: [
        { href: routes.admin, label: nav.dashboard, icon: LayoutDashboard, exact: true },
        { href: routes.adminReports, label: nav.reports, icon: Flag },
        { href: routes.adminListings, label: nav.listings, icon: Package },
        { href: routes.adminUsers, label: nav.users, icon: Users },
        { href: routes.adminSupport, label: nav.support, icon: LifeBuoy },
        { href: routes.adminLog, label: nav.log, icon: ClipboardList },
      ],
    },
    administration: {
      title: nav.administration,
      items: [
        { href: routes.adminTeam, label: nav.team, icon: ShieldCheck },
        { href: routes.adminCategories, label: nav.categories, icon: FolderTree },
        { href: routes.adminCities, label: nav.cities, icon: Building2 },
        { href: routes.adminAnnouncements, label: nav.announcement, icon: Megaphone },
        { href: routes.adminAntiSpam, label: nav.antiSpam, icon: ShieldBan },
        { href: routes.adminConfig, label: nav.config, icon: Settings2 },
      ],
    },
  };
}

function isActive(item: Item, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/**
 * Navigation de l'administration : un bouton « menu » (hamburger) ouvre un
 * panneau latéral regroupant les rubriques, sur mobile comme sur ordinateur.
 * Les modérateurs ne voient que la modération.
 */
export function AdminNav({ role, roleLabel }: { role: "admin" | "moderator"; roleLabel: string }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  const { moderation, administration } = navGroups(t);
  const groups = role === "admin" ? [moderation, administration] : [moderation];
  const current = groups.flatMap((group) => group.items).find((item) => isActive(item, pathname));
  const CurrentIcon = current?.icon ?? LayoutDashboard;

  // Le panneau se referme dès qu'on choisit une rubrique.
  const closeOnLinkClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2 pr-4 shadow-card">
        <DialogPrimitive.Trigger
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          aria-label={t.adminUi.nav.openMenu}
        >
          <Menu className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">{t.adminUi.nav.menu}</span>
        </DialogPrimitive.Trigger>
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
          <CurrentIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{current?.label ?? t.adminUi.nav.administration}</span>
        </p>
        <span className="hidden shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary sm:inline">
          {roleLabel}
        </span>
      </div>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col gap-4 overflow-y-auto bg-card px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-raised duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left"
          onClickCapture={closeOnLinkClick}
        >
          <div className="flex items-center justify-between gap-2 px-3">
            <DialogPrimitive.Title className="flex flex-col">
              <span className="flex items-center gap-2 text-base font-bold tracking-tight">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                {t.adminUi.nav.space}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{roleLabel}</span>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t.adminUi.nav.closeMenu}
            >
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            {t.adminUi.nav.sections}
          </DialogPrimitive.Description>

          <nav aria-label={t.adminUi.nav.administration} className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item, pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
