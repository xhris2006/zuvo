import { Bell, Heart, MessageCircle, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./desktop-nav";
import { Logo } from "./logo";
import { SearchForm } from "./search-form";

function IconLink({
  href,
  label,
  className,
  children,
}: {
  href: Route;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button asChild variant="ghost" size="icon" className={cn("rounded-full", className)}>
      <Link href={href} aria-label={label} title={label}>
        {children}
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const t = getDictionary();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center gap-3 lg:gap-6">
        <Logo className="shrink-0" />

        <SearchForm id="header-search" className="hidden max-w-xl md:block" />

        <div className="ml-auto flex items-center gap-1 lg:gap-2">
          <DesktopNav />
          <IconLink href={routes.messages} label={t.nav.messages} className="hidden md:inline-flex">
            <MessageCircle className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href={routes.favorites} label={t.nav.favorites}>
            <Heart className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href={routes.notifications} label={t.nav.notifications}>
            <Bell className="size-5" aria-hidden="true" />
          </IconLink>
          <Button asChild className="ml-1 hidden md:inline-flex">
            <Link href={routes.sell}>
              <Plus aria-hidden="true" />
              {t.nav.sell}
            </Link>
          </Button>
          <Button asChild variant="outline" className="hidden md:inline-flex">
            <Link href={routes.signIn}>{t.common.signIn}</Link>
          </Button>
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">
        <SearchForm id="header-search-mobile" />
      </div>
    </header>
  );
}
