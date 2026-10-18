import { Bell, Heart, MessageCircle, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/components/unread-counts";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getCurrentProfile } from "@/features/profiles/queries";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./desktop-nav";
import { Logo } from "./logo";
import { SearchForm } from "./search-form";
import { UserMenu } from "./user-menu";

function IconLink({
  href,
  label,
  unread,
  className,
  children,
}: {
  href: Route;
  label: string;
  unread?: "messages" | "notifications";
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
      </Link>
    </Button>
  );
}

export async function SiteHeader() {
  const t = getDictionary();
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center gap-3 lg:gap-6">
        <Logo className="shrink-0" />

        <SearchForm id="header-search" className="hidden max-w-xl md:block" />

        <div className="ml-auto flex items-center gap-1 lg:gap-2">
          <DesktopNav />
          <IconLink
            href={routes.messages}
            label={t.nav.messages}
            unread="messages"
            className="hidden md:inline-flex"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href={routes.favorites} label={t.nav.favorites}>
            <Heart className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href={routes.notifications} label={t.nav.notifications} unread="notifications">
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
              />
            </div>
          ) : (
            <Button asChild variant="outline" className="hidden md:inline-flex">
              <Link href={routes.signIn}>{t.common.signIn}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">
        <SearchForm id="header-search-mobile" />
      </div>
    </header>
  );
}
