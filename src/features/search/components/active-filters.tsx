import { X } from "lucide-react";
import Link from "next/link";
import { exploreHref } from "@/config/routes";
import { cityName } from "@/features/locations/queries";
import { getDictionary } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { type SearchFilters, toSearchParams } from "../schema";

type ActiveFiltersProps = {
  filters: SearchFilters;
  categories: { slug: string; name: string }[];
};

/** Filtres appliqués, chacun retirable d'un clic (liens, sans JavaScript). */
export async function ActiveFilters({ filters, categories }: ActiveFiltersProps) {
  const t = getDictionary();
  const without = (...keys: (keyof SearchFilters)[]) => {
    const next: Partial<SearchFilters> = { ...filters, page: 1 };
    for (const key of keys) delete next[key];
    return exploreHref(toSearchParams(next));
  };

  const chips: { label: string; href: ReturnType<typeof exploreHref> }[] = [];
  if (filters.q) chips.push({ label: `« ${filters.q} »`, href: without("q") });
  if (filters.category) {
    const name = categories.find((category) => category.slug === filters.category)?.name;
    chips.push({ label: name ?? filters.category, href: without("category") });
  }
  if (filters.city) {
    chips.push({ label: (await cityName(filters.city)) ?? filters.city, href: without("city") });
  }
  if (filters.condition) {
    chips.push({ label: t.listing.conditions[filters.condition], href: without("condition") });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice !== undefined ? formatPrice(filters.minPrice) : null;
    const max = filters.maxPrice !== undefined ? formatPrice(filters.maxPrice) : null;
    const label = min && max ? `${min} – ${max}` : min ? `À partir de ${min}` : `Jusqu'à ${max}`;
    chips.push({ label, href: without("minPrice", "maxPrice") });
  }

  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filtres appliqués">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover"
            aria-label={`Retirer le filtre ${chip.label}`}
          >
            {chip.label}
            <X className="size-3.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
