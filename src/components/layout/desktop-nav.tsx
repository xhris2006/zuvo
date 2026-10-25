"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/config/routes";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-items";

/** Liens textuels de l'en-tête sur tablette (la barre latérale prend le relais ensuite). */
export function DesktopNav() {
  const pathname = usePathname();
  const t = useT();
  const links = [
    { href: routes.explore, label: t.nav.explore },
    { href: routes.help, label: t.nav.helpShort },
  ];

  return (
    <nav aria-label={t.nav.primary} className="hidden items-center gap-1 md:flex">
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
