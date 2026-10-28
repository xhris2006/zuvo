import { Bell, CircleHelp, MessageCircle, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { isCurrentUserStaff } from "@/features/admin/queries";
import { PushAttentionDot } from "@/features/notifications/components/push-attention-dot";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/components/unread-counts";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getCurrentProfile } from "@/features/profiles/queries";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./desktop-nav";
import { HideOnScrollHeader } from "./hide-on-scroll-header";
import { Logo } from "./logo";
import { MobileSearchRow } from "./mobile-search-row";
import { SearchForm } from "./search-form";
import { UserMenu } from "./user-menu";

function IconLink({
  href,
  label,
  unread,
  attention = false,
  className,
  children,
}: {
  href: Route;
  label: string;
  unread?: "messages" | "notifications";
  /** Point clignotant tant que les notifications ne sont pas activées (membres). */
  attention?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button asChild variant="ghost" size="icon" className={cn("relative rounded-full", className)}>
      <Link href={href} title={label}>
        {children}
        <span className="sr-only">{label}</span>
        {unread ? (
          <>
            <UnreadLabel kind={unread} />
            <UnreadBadge kind={unread} className="top-0.5 right-0.5" />
          </>
        ) : null}
        {attention ? <PushAttentionDot className="bottom-1.5 left-1.5" /> : null}
      </Link>
    </Button>
  );
}

export async function SiteHeader() {
  const t = await getT();
  const profile = await getCurrentProfile();
  // Lien « Administration » pour toute l'équipe (administrateurs et modérateurs).
  const isAdmin = profile ? await isCurrentUserStaff() : false;

  return (
    <HideOnScrollHeader
      data-site-header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden dark:bg-chrome/95 dark:supports-[backdrop-filter]:bg-chrome/90"
    >
      <div className="container-page flex h-14 items-center gap-3 md:h-16 lg:gap-6">
        {/* Mobile : logo centré entre deux colonnes de même largeur. */}
        <div className="flex flex-1 md:hidden">
          {profile ? null : (
            <IconLink href={routes.help} label={t.nav.help} className="-ml-2">
              <CircleHelp className="size-5" aria-hidden="true" />
            </IconLink>
          )}
        </div>

        <Logo className="shrink-0" />

        <SearchForm id="header-search" className="hidden max-w-xl md:block" />

        <div className="flex flex-1 items-center justify-end gap-1 md:ml-auto md:flex-none lg:gap-2">
          <DesktopNav />
          <IconLink
            href={routes.messages}
            label={t.nav.messages}
            unread="messages"
            className="hidden md:inline-flex"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink
            href={routes.notifications}
            label={t.nav.notifications}
            unread="notifications"
            attention={Boolean(profile)}
            className="max-md:-mr-2"
          >
            <Bell className="size-5" aria-hidden="true" />
          </IconLink>
          <Button asChild className="ml-1 hidden md:inline-flex">
            <Link href={routes.sell}>
              <Plus aria-hidden="true" />
              {t.nav.sell}
            </Link>
          </Button>
          {profile ? (
            <div className="ml-1 hidden md:block">
              <UserMenu
                displayName={profile.display_name}
                username={profile.username}
                avatarUrl={avatarUrl(profile.avatar_path)}
                isAdmin={isAdmin}
              />
            </div>
          ) : (
            <Button asChild variant="outline" className="hidden md:inline-flex">
              <Link href={routes.signIn}>{t.common.signIn}</Link>
            </Button>
          )}
        </div>
      </div>

      <Suspense>
        <MobileSearchRow />
      </Suspense>
    </HideOnScrollHeader>
  );
}
