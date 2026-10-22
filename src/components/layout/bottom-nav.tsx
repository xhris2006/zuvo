"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/components/unread-counts";
import { LinkPending } from "@/components/ui/link-pending";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { getPrimaryNavItems, isNavItemActive } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const t = getDictionary();
  const items = getPrimaryNavItems(t);

  return (
    <nav
      data-bottom-nav
      style={{ viewTransitionName: "bottom-nav" }}
      aria-label={t.nav.primary}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
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
                  "group relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.emphasis ? (
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card transition-transform group-active:scale-90",
                      active && "ring-2 ring-brand-200 ring-offset-1 ring-offset-card",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                ) : (
                  <span className="relative transition-transform duration-150 group-active:scale-90">
                    <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                    {item.badge ? (
                      <UnreadBadge kind={item.badge} className="-top-1.5 -right-2.5" />
                    ) : null}
                  </span>
                )}
                <span className={cn(item.emphasis && "sr-only")}>{item.label}</span>
                {active && !item.emphasis ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 animate-in rounded-full bg-primary duration-300 fade-in-0 zoom-in-50"
                  />
                ) : null}
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
