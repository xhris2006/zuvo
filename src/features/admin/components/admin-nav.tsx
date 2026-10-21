"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

const items = [
  { href: routes.admin, label: "Tableau de bord", exact: true },
  { href: routes.adminReports, label: "Signalements" },
  { href: routes.adminUsers, label: "Utilisateurs" },
  { href: routes.adminLog, label: "Journal" },
  { href: routes.adminConfig, label: "Configuration" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 border-b border-border">
        {items.map((item) => {
          const active = "exact" in item ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
