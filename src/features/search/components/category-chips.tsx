import Link from "next/link";
import { exploreHref } from "@/config/routes";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { type SearchFilters, toSearchParams } from "../schema";

type CategoryChipsProps = {
  filters: SearchFilters;
  categories: { slug: string; name: string }[];
  className?: string;
};

/** Raccourcis de catégorie défilants (petits écrans), en gardant les autres filtres. */
export function CategoryChips({ filters, categories, className }: CategoryChipsProps) {
  const t = getDictionary();
  const chips = [
    { slug: undefined, name: t.explore.allCategoriesShort },
    ...categories.map((category) => ({ slug: category.slug, name: category.name })),
  ];
  return (
    <nav aria-label={t.explore.category} className={className}>
      <ul className="-mx-4 flex scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => {
          const active = filters.category === chip.slug;
          return (
            <li key={chip.slug ?? "all"} className="shrink-0">
              <Link
                href={exploreHref(toSearchParams({ ...filters, category: chip.slug, page: 1 }))}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {chip.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
