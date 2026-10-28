"use client";

import {
  ArrowLeft,
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
  Send,
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
import { type MouseEvent, type ReactNode, useState } from "react";
import { LogoMark } from "@/components/layout/logo-mark";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Item = { href: Route; label: string; icon: LucideIcon; exact?: boolean };
type Group = { title: string; items: Item[] };

function navGroups(t: Dictionary, role: "admin" | "moderator"): Group[] {
  const nav = t.adminUi.nav;
  const moderation: Group = {
    title: nav.moderation,
    items: [
      { href: routes.admin, label: nav.dashboard, icon: LayoutDashboard, exact: true },
      { href: routes.adminReports, label: nav.reports, icon: Flag },
      { href: routes.adminListings, label: nav.listings, icon: Package },
      { href: routes.adminUsers, label: nav.users, icon: Users },
      { href: routes.adminNotify, label: nav.notify, icon: Send },
      { href: routes.adminSupport, label: nav.support, icon: LifeBuoy },
      { href: routes.adminLog, label: nav.log, icon: ClipboardList },
    ],
  };
  if (role !== "admin") return [moderation];
  return [
    moderation,
    {
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
  ];
}

function isActive(item: Item, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Contenu de la barre latérale : marque, rubriques et retour au site. */
function SidebarContent({
  groups,
  pathname,
  roleLabel,
  title,
  close,
}: {
  groups: Group[];
  pathname: string;
  roleLabel: string;
  /** Titre de l'espace (élément Title du tiroir sur mobile). */
  title: ReactNode;
  /** Bouton de fermeture (tiroir mobile uniquement). */
  close?: ReactNode;
}) {
  const t = useT();
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="size-8 shrink-0" />
          <div className="flex min-w-0 flex-col">
            {title}
            <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
          </div>
        </div>
        {close}
      </div>

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
                        "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-semibold text-primary-ink"
                          : "font-medium text-foreground hover:bg-muted",
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

      <div className="mt-auto border-t border-border px-3 pt-3">
        <Link
          href={routes.home}
          className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-[1.125rem] shrink-0" aria-hidden="true" />
          {t.adminUi.nav.backToSite(siteConfig.name)}
        </Link>
      </div>
    </>
  );
}

/**
 * Navigation de l'administration : une barre latérale, seule navigation de
 * l'espace (l'en-tête, la barre latérale et la navigation du bas du site sont
 * masqués). Fixe sur ordinateur ; sur mobile, ouverte par le bouton « menu ».
 * Les modérateurs ne voient que la modération.
 */
export function AdminNav({ role, roleLabel }: { role: "admin" | "moderator"; roleLabel: string }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = navGroups(t, role);
  const current = groups.flatMap((group) => group.items).find((item) => isActive(item, pathname));
  const CurrentIcon = current?.icon ?? LayoutDashboard;
  const spaceTitle = (
    <span className="truncate text-sm font-bold tracking-tight">{t.adminUi.nav.space}</span>
  );

  // Le tiroir se referme dès qu'on choisit une rubrique.
  const closeOnLinkClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  };

  return (
    <>
      <aside
        data-admin-sidebar
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 overflow-y-auto border-r border-border bg-card py-5 lg:flex dark:bg-chrome"
      >
        <SidebarContent
          groups={groups}
          pathname={pathname}
          roleLabel={roleLabel}
          title={spaceTitle}
        />
      </aside>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <div className="sticky top-0 z-40 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden dark:bg-chrome/95">
          <DialogPrimitive.Trigger
            className="-ml-1.5 inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            aria-label={t.adminUi.nav.openMenu}
          >
            <Menu className="size-5" aria-hidden="true" />
          </DialogPrimitive.Trigger>
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
            <CurrentIcon className="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
            <span className="truncate">{current?.label ?? t.adminUi.nav.administration}</span>
          </p>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-ink">
            {roleLabel}
          </span>
        </div>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col gap-6 overflow-y-auto bg-card pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-raised duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden dark:bg-chrome"
            onClickCapture={closeOnLinkClick}
          >
            <DialogPrimitive.Description className="sr-only">
              {t.adminUi.nav.sections}
            </DialogPrimitive.Description>
            <SidebarContent
              groups={groups}
              pathname={pathname}
              roleLabel={roleLabel}
              title={<DialogPrimitive.Title asChild>{spaceTitle}</DialogPrimitive.Title>}
              close={
                <DialogPrimitive.Close
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t.adminUi.nav.closeMenu}
                >
                  <X className="size-4" aria-hidden="true" />
                </DialogPrimitive.Close>
              }
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
