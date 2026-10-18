import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** Construit l'URL d'une page donnée. */
  hrefFor: (page: number) => Route;
  label?: string;
};

/** Pagination accessible (liens), utilisable sans JavaScript. */
export function Pagination({ page, pageCount, hrefFor, label = "Pagination" }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from(
    new Set([1, page - 1, page, page + 1, pageCount].filter((p) => p >= 1 && p <= pageCount)),
  ).sort((a, b) => a - b);

  const linkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted";

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} aria-label="Page précédente">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
      {pages.map((value, index) => {
        const gap = index > 0 && value - pages[index - 1]! > 1;
        return (
          <span key={value} className="flex items-center gap-1.5">
            {gap ? (
              <span aria-hidden="true" className="px-1 text-muted-foreground">
                …
              </span>
            ) : null}
            <Link
              href={hrefFor(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(
                linkClass,
                value === page &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {value}
            </Link>
          </span>
        );
      })}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass} aria-label="Page suivante">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
