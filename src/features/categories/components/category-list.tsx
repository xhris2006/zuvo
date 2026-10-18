import Link from "next/link";
import { exploreHref } from "@/config/routes";
import { toSearchParams } from "@/features/search/schema";
import { type CategorySummary, getCategoryIcon } from "../data";

/** Grille de catégories (défilement horizontal sur mobile). */
export function CategoryList({ categories }: { categories: readonly CategorySummary[] }) {
  return (
    <ul className="-mx-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.slug);
        return (
          <li key={category.slug} className="shrink-0 snap-start">
            <Link
              href={exploreHref(toSearchParams({ category: category.slug }))}
              className="flex h-full w-28 flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center text-xs font-medium shadow-card transition-colors hover:border-brand-300 hover:bg-accent sm:w-auto sm:flex-row sm:p-3 sm:text-left sm:text-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="leading-tight">{category.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
