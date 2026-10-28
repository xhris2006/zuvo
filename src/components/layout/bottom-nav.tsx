"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/components/unread-counts";
import { LinkPending } from "@/components/ui/link-pending";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { getPrimaryNavItems, isNavItemActive } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const items = getPrimaryNavItems(t);

  return (
    <nav
      data-bottom-nav
      style={{ viewTransitionName: "bottom-nav" }}
      aria-label={t.nav.primary}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/92 md:hidden dark:bg-chrome/95 dark:supports-[backdrop-filter]:bg-chrome/90"
    >
      <ul className="mx-auto grid h-(--bottom-nav-height) max-w-md grid-cols-5">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary-ink" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.emphasis ? (
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-primary-foreground shadow-raised ring-4 ring-card transition-transform group-hover:scale-105 group-active:scale-90",
                      active && "from-brand-500 to-brand-600",
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 group-active:scale-90",
                      active && "bg-primary/12",
                    )}
                  >
                    <span className="relative">
                      <Icon
                        className="size-6"
                        strokeWidth={active ? 2.3 : 1.8}
                        aria-hidden="true"
                      />
                      {item.badge ? (
                        <UnreadBadge kind={item.badge} className="-top-1.5 -right-2.5" />
                      ) : null}
                    </span>
                  </span>
                )}
                <span className={cn(item.emphasis && "sr-only", active && "font-semibold")}>
                  {item.label}
                </span>
                {active ? null : <LinkPending variant="bar" />}
                {item.badge ? <UnreadLabel kind={item.badge} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
