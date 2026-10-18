"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/config/routes";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-items";

/** Liens textuels de l'en-tête sur grand écran, avec l'état actif. */
export function DesktopNav() {
  const pathname = usePathname();
  const t = getDictionary();
  const links = [{ href: routes.explore, label: t.nav.explore }];

  return (
    <nav aria-label={t.nav.primary} className="hidden items-center gap-1 lg:flex">
      {links.map((link) => {
        const active = isNavItemActive(link, pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
