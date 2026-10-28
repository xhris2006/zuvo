"use client";

import {
  Bell,
  Compass,
  House,
  LifeBuoy,
  LogOut,
  type LucideIcon,
  Menu,
  MessageCircle,
  Plus,
  Rss,
  Settings,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinkPending } from "@/components/ui/link-pending";
import { routes } from "@/config/routes";
import { signOutAction } from "@/features/auth/actions";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/components/unread-counts";
import { PushAttentionDot } from "@/features/notifications/components/push-attention-dot";
import { PushEndpointField } from "@/features/notifications/components/push-endpoint-field";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-items";

type SidebarItem = {
  href: Route;
  label: string;
  icon?: LucideIcon;
  exact?: boolean;
  badge?: "messages" | "notifications";
};

type SidebarNavProps = {
  /** Membre connecté (sinon : boutons de connexion et d'inscription). */
  account: { displayName: string; username: string; avatarUrl: string | null } | null;
  /** Affichage seulement : l'accès à l'administration est vérifié côté serveur. */
  isStaff: boolean;
};

const itemClass =
  "group relative flex h-11 items-center gap-3.5 rounded-xl px-3 text-sm transition-colors";

/** Liens de la barre latérale (ordinateur), avec l'état actif et les compteurs. */
export function SidebarNav({ account, isStaff }: SidebarNavProps) {
  const pathname = usePathname();
  const t = useT();
  const items: SidebarItem[] = [
    { href: routes.home, label: t.nav.home, icon: House, exact: true },
    { href: routes.explore, label: t.nav.explore, icon: Compass },
    { href: routes.messages, label: t.nav.messages, icon: MessageCircle, badge: "messages" },
    { href: routes.notifications, label: t.nav.notifications, icon: Bell, badge: "notifications" },
  ];
  if (account) items.push({ href: routes.profile, label: t.nav.profile });
  if (isStaff) items.push({ href: routes.admin, label: t.nav.admin, icon: ShieldCheck });

  return (
    <>
      <nav aria-label={t.nav.primary} className="flex flex-col gap-1 px-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    itemClass,
                    active
                      ? "bg-primary/10 font-semibold text-primary-ink"
                      : "font-medium text-foreground hover:bg-muted",
                  )}
                >
                  <span className="relative flex size-6 shrink-0 items-center justify-center">
                    {Icon ? (
                      <Icon
                        className="size-[1.375rem] transition-transform group-hover:scale-105"
                        strokeWidth={active ? 2.3 : 1.8}
                        aria-hidden="true"
                      />
                    ) : account ? (
                      <Avatar
                        name={account.displayName}
                        src={account.avatarUrl}
                        size="sm"
                        className={cn(
                          "size-6 text-[0.625rem]",
                          active && "ring-2 ring-primary-line",
                        )}
                      />
                    ) : null}
                    {item.badge ? (
                      <UnreadBadge kind={item.badge} className="-top-1.5 -right-2" />
                    ) : null}
                    {item.badge === "notifications" && account ? (
                      <PushAttentionDot className="-bottom-0.5 -left-1" />
                    ) : null}
                  </span>
                  {item.label}
                  {item.badge ? <UnreadLabel kind={item.badge} /> : null}
                  {active ? null : (
                    <LinkPending variant="bar" className="top-auto bottom-1 left-3" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pt-4">
        <Link
          href={routes.sell}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-raised transition-colors hover:bg-primary-hover"
        >
          <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
          {t.nav.sellCta}
        </Link>
      </div>

      <div className="mt-auto flex flex-col gap-2 px-3 pt-6 pb-5">
        {account ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                itemClass,
                "w-full font-medium hover:bg-muted data-[state=open]:bg-muted",
              )}
            >
              <Menu className="size-[1.375rem]" strokeWidth={1.8} aria-hidden="true" />
              {t.nav.more}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60">
              <DropdownMenuItem asChild>
                <Link href={routes.settings}>
                  <Settings aria-hidden="true" />
                  {t.profile.settings}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routes.feed}>
                  <Rss aria-hidden="true" />
                  {t.profile.feed}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routes.help}>
                  <LifeBuoy aria-hidden="true" />
                  {t.nav.help}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routes.install}>
                  <Smartphone aria-hidden="true" />
                  {t.install.menuLink}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOutAction}>
                <PushEndpointField />
                {/* Le menu reste ouvert pendant l'envoi pour ne pas démonter le formulaire. */}
                <DropdownMenuItem
                  asChild
                  onSelect={(event) => event.preventDefault()}
                  className="text-danger"
                >
                  <button type="submit" className="w-full">
                    <LogOut aria-hidden="true" />
                    {t.profile.signOut}
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link
              href={routes.help}
              className={cn(itemClass, "font-medium text-foreground hover:bg-muted")}
            >
              <LifeBuoy className="size-[1.375rem]" strokeWidth={1.8} aria-hidden="true" />
              {t.nav.help}
            </Link>
            <Link
              href={routes.signIn}
              className="flex h-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted"
            >
              {t.common.signIn}
            </Link>
            <Link
              href={routes.signUp}
              className="flex h-10 items-center justify-center rounded-xl text-sm font-semibold text-primary-ink hover:bg-accent"
            >
              {t.common.signUp}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
