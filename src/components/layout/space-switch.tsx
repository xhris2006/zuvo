"use client";

import { BriefcaseBusiness, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/config/routes";
import { spaceOf } from "@/features/services/space";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Bascule entre la marketplace et l'espace Services : l'espace actif est mis
 * en évidence par une pastille qui glisse d'un côté à l'autre.
 */
export function SpaceSwitch({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useT();
  const space = spaceOf(pathname);
  const items = [
    { space: "marketplace", href: routes.home, label: t.spaces.marketplace, icon: ShoppingBag },
    { space: "services", href: routes.services, label: t.spaces.services, icon: BriefcaseBusiness },
  ] as const;

  return (
    <nav
      aria-label={t.spaces.label}
      className={cn(
        "relative grid h-10 w-full max-w-xs grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-card transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:bg-background",
          space === "services" && "translate-x-full",
        )}
      />
      {items.map((item) => {
        const active = item.space === space;
        const Icon = item.icon;
        return (
          <Link
            key={item.space}
            href={item.href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active ? "text-primary-ink" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pages d'accueil et de navigation des deux espaces, où la bascule apparaît sous l'en-tête. */
const switchPaths: string[] = [
  routes.home,
  routes.explore,
  routes.feed,
  routes.services,
  routes.servicesSearch,
];

/** Bascule affichée sous l'en-tête (téléphone et tablette) sur les pages de navigation. */
export function SpaceSwitchRow() {
  const pathname = usePathname();
  if (!switchPaths.includes(pathname)) return null;
  return (
    <div className="container-page flex justify-center pb-2.5">
      <SpaceSwitch />
    </div>
  );
}
