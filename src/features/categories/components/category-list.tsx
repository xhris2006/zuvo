import Link from "next/link";
import { exploreHref } from "@/config/routes";
import { toSearchParams } from "@/features/search/schema";
import { type CategorySummary, getCategoryIcon } from "../data";

/**
 * Catégories sous forme d'icônes rondes : rangée défilante sur mobile,
 * grille sur grand écran.
 */
export function CategoryList({ categories }: { categories: readonly CategorySummary[] }) {
  return (
    <ul className="-mx-4 flex snap-x scroll-px-2 [scrollbar-width:none] gap-1 overflow-x-auto px-2 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-x-2 sm:gap-y-4 sm:overflow-visible sm:px-0 lg:grid-cols-8 [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.slug);
        return (
          <li key={category.slug} className="shrink-0 snap-start">
            <Link
              href={exploreHref(toSearchParams({ category: category.slug }))}
              className="group flex w-[4.75rem] flex-col items-center gap-2 rounded-xl p-1 text-center sm:w-auto"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors group-hover:bg-secondary-hover">
                <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="line-clamp-2 text-[0.75rem] leading-tight font-medium text-foreground">
                {category.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
