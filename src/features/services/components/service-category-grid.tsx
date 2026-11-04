import Link from "next/link";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import {
  getServiceCategoryIcon,
  localizedServiceCategory,
  type ServiceCategory,
} from "../categories";
import { serviceSearchHref } from "../links";
import { serviceSearchParams } from "../schemas";

/** Tuiles des catégories de services, chacune ouvrant la recherche filtrée. */
export function ServiceCategoryGrid({
  t,
  categories,
}: {
  t: ServerDictionary;
  categories: ServiceCategory[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = getServiceCategoryIcon(category.slug);
        const text = localizedServiceCategory(t.serviceCategoryNames, category);
        return (
          <li key={category.slug}>
            <Link
              href={serviceSearchHref(serviceSearchParams({ category: category.slug }))}
              className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-card transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_30px_-18px_rgb(255_122_0/0.55)] sm:p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary-ink transition-transform duration-300 group-hover:scale-105">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm leading-snug font-semibold">{text.name}</span>
              {text.description ? (
                <span className="line-clamp-2 hidden text-xs text-muted-foreground sm:block">
                  {text.description}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
