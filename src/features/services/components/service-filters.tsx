import { SlidersHorizontal } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { routes } from "@/config/routes";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import { cn } from "@/lib/utils";
import { localizedServiceCategory, type ServiceCategory } from "../categories";
import { serviceAvailabilities, servicePricingTypes } from "../constants";
import {
  countServiceFilters,
  type ServiceSearchFilters,
  serviceRecentOptions,
  serviceSortOptions,
} from "../schemas";

type ServiceFiltersProps = {
  t: ServerDictionary;
  filters: ServiceSearchFilters;
  categories: ServiceCategory[];
  cities: Array<{ slug: string; name: string }>;
};

/**
 * Filtres avancés (formulaire GET, sans JavaScript) : repliés sur téléphone,
 * toujours ouverts dans la colonne latérale sur ordinateur.
 */
export function ServiceFilters({ t, filters, categories, cities }: ServiceFiltersProps) {
  const texts = t.servicesPages;
  const active = countServiceFilters(filters);
  const field = "flex flex-col gap-1.5";

  const renderForm = (prefix: string) => (
    <Form action={routes.servicesSearch} className="flex flex-col gap-4">
      {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
      <div className={field}>
        <Label htmlFor={`${prefix}-category`}>{texts.category}</Label>
        <Select id={`${prefix}-category`} name="categorie" defaultValue={filters.category ?? ""}>
          <option value="">{texts.allCategories}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {localizedServiceCategory(t.serviceCategoryNames, category).name}
            </option>
          ))}
        </Select>
      </div>
      <div className={field}>
        <Label htmlFor={`${prefix}-city`}>{texts.city}</Label>
        <Select id={`${prefix}-city`} name="ville" defaultValue={filters.city ?? ""}>
          <option value="">{texts.allCities}</option>
          {cities.map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.name}
            </option>
          ))}
        </Select>
      </div>
      <div className={field}>
        <Label htmlFor={`${prefix}-district`}>{texts.district}</Label>
        <Input
          id={`${prefix}-district`}
          name="quartier"
          defaultValue={filters.district ?? ""}
          maxLength={60}
          placeholder={texts.districtPlaceholder}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <Label htmlFor={`${prefix}-min`}>{texts.minPrice}</Label>
          <Input
            id={`${prefix}-min`}
            name="min"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={filters.minPrice ?? ""}
          />
        </div>
        <div className={field}>
          <Label htmlFor={`${prefix}-max`}>{texts.maxPrice}</Label>
          <Input
            id={`${prefix}-max`}
            name="max"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={filters.maxPrice ?? ""}
          />
        </div>
      </div>
      <div className={field}>
        <Label htmlFor={`${prefix}-pricing`}>{texts.pricing}</Label>
        <Select id={`${prefix}-pricing`} name="tarif" defaultValue={filters.pricing ?? ""}>
          <option value="">{texts.anyPricing}</option>
          {servicePricingTypes.map((type) => (
            <option key={type} value={type}>
              {t.services.pricingTypes[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className={field}>
        <Label htmlFor={`${prefix}-availability`}>{texts.availability}</Label>
        <Select
          id={`${prefix}-availability`}
          name="dispo"
          defaultValue={filters.availability ?? ""}
        >
          <option value="">{texts.anyAvailability}</option>
          {serviceAvailabilities.map((value) => (
            <option key={value} value={value}>
              {t.services.availability[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className={field}>
        <Label htmlFor={`${prefix}-recent`}>{texts.recent}</Label>
        <Select id={`${prefix}-recent`} name="recent" defaultValue={filters.recent ?? ""}>
          <option value="">{texts.anyTime}</option>
          {serviceRecentOptions.map((days) => (
            <option key={days} value={days}>
              {texts.lastDays(days)}
            </option>
          ))}
        </Select>
      </div>
      <div className={field}>
        <Label htmlFor={`${prefix}-sort`}>{texts.sort}</Label>
        <Select id={`${prefix}-sort`} name="tri" defaultValue={filters.sort}>
          {serviceSortOptions.map((sort) => (
            <option key={sort} value={sort}>
              {texts.sortOptions[sort]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit">{texts.apply}</Button>
        {active > 0 || filters.sort !== "recent" ? (
          <Link
            href={
              filters.q
                ? `${routes.servicesSearch}?q=${encodeURIComponent(filters.q)}`
                : routes.servicesSearch
            }
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            {texts.reset}
          </Link>
        ) : null}
      </div>
    </Form>
  );

  return (
    <>
      <details className="group rounded-2xl border border-border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {texts.showFilters(active)}
          </span>
          <span
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="border-t border-border p-4">{renderForm("filters-mobile")}</div>
      </details>
      <aside
        aria-label={texts.filtersTitle}
        className="sticky top-6 hidden rounded-2xl border border-border bg-card p-5 lg:block"
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {texts.filtersTitle}
        </h2>
        {renderForm("filters")}
      </aside>
    </>
  );
}
