import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listingLimits } from "@/config/limits";
import { cities } from "@/config/locations";
import { routes } from "@/config/routes";
import type { CategorySummary } from "@/features/categories/data";
import { listingConditions } from "@/features/listings/constants";
import { getDictionary } from "@/i18n";
import { type SearchFilters, sortOptions } from "../schema";

type FiltersFormProps = {
  filters: SearchFilters;
  categories: readonly CategorySummary[];
  /** Préfixe des identifiants, pour afficher plusieurs formulaires sur une page. */
  idPrefix: string;
};

/**
 * Formulaire de filtres en GET : il fonctionne sans JavaScript et produit
 * une URL partageable. Les valeurs sont revalidées côté serveur.
 */
export function FiltersForm({ filters, categories, idPrefix }: FiltersFormProps) {
  const t = getDictionary();
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <Form action={routes.explore} className="flex flex-col gap-5">
      <Field id={id("q")} label={t.explore.keywords}>
        {(control) => (
          <Input
            {...control}
            name="q"
            type="search"
            defaultValue={filters.q}
            maxLength={100}
            placeholder={t.explore.keywordsPlaceholder}
          />
        )}
      </Field>

      <Field id={id("category")} label={t.explore.category}>
        {(control) => (
          <Select {...control} name="category" defaultValue={filters.category ?? ""}>
            <option value="">{t.explore.allCategories}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field id={id("city")} label={t.explore.city}>
        {(control) => (
          <Select {...control} name="city" defaultValue={filters.city ?? ""}>
            <option value="">{t.explore.allCities}</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field id={id("condition")} label={t.explore.condition}>
        {(control) => (
          <Select {...control} name="condition" defaultValue={filters.condition ?? ""}>
            <option value="">{t.explore.allConditions}</option>
            {listingConditions.map((condition) => (
              <option key={condition} value={condition}>
                {t.listing.conditions[condition]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id={id("min")} label={t.explore.priceMin}>
          {(control) => (
            <Input
              {...control}
              name="minPrice"
              type="number"
              inputMode="numeric"
              min={0}
              max={listingLimits.priceMax}
              step={1}
              defaultValue={filters.minPrice}
            />
          )}
        </Field>
        <Field id={id("max")} label={t.explore.priceMax}>
          {(control) => (
            <Input
              {...control}
              name="maxPrice"
              type="number"
              inputMode="numeric"
              min={0}
              max={listingLimits.priceMax}
              step={1}
              defaultValue={filters.maxPrice}
            />
          )}
        </Field>
      </div>

      <Field id={id("sort")} label={t.explore.sort}>
        {(control) => (
          <Select {...control} name="sort" defaultValue={filters.sort}>
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {t.explore.sortOptions[option]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {t.explore.applyFilters}
        </Button>
        <Button asChild variant="ghost">
          <Link href={routes.explore}>{t.explore.resetFilters}</Link>
        </Button>
      </div>
    </Form>
  );
}
