import { LayoutGrid, LayoutList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export const listingViews = ["fil", "grille"] as const;
export type ListingView = (typeof listingViews)[number];

/** Mode d'affichage demandé dans l'URL (`?vue=grille`) ; le fil par défaut. */
export function parseListingView(value: string | string[] | undefined): ListingView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "grille" ? "grille" : "fil";
}

type ListingViewToggleProps = {
  current: ListingView;
  /** Lien vers la même page dans l'autre mode d'affichage. */
  hrefFor: (view: ListingView) => Route;
  className?: string;
};

/** Bascule fil / grille : deux liens, utilisable sans JavaScript. */
export async function ListingViewToggle({ current, hrefFor, className }: ListingViewToggleProps) {
  const t = await getT();
  const options = [
    { view: "fil", label: t.listing.viewFeed, icon: LayoutList },
    { view: "grille", label: t.listing.viewGrid, icon: LayoutGrid },
  ] as const;
  return (
    <div
      role="group"
      aria-label={t.listing.viewLabel}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-1",
        className,
      )}
    >
      {options.map(({ view, label, icon: Icon }) => {
        const active = view === current;
        return (
          <Link
            key={view}
            href={hrefFor(view)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
