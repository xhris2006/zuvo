"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { getPrimaryNavItems, isNavItemActive } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const t = getDictionary();
  const items = getPrimaryNavItems(t);

  return (
    <nav
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
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.emphasis ? (
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card transition-transform active:scale-95",
                      active && "ring-2 ring-brand-200 ring-offset-1 ring-offset-card",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                ) : (
                  <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                )}
                <span className={cn(item.emphasis && "sr-only")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
