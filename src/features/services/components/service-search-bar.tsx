import { MapPin, Search } from "lucide-react";
import Form from "next/form";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import { cn } from "@/lib/utils";

/**
 * Grande barre de recherche de l'espace Services : un service, un métier ou
 * un prestataire, et la ville. Formulaire GET, utilisable sans JavaScript.
 */
export function ServiceSearchBar({
  t,
  cities,
  defaultQuery,
  defaultCity,
  hidden,
  className,
}: {
  t: ServerDictionary;
  cities: Array<{ slug: string; name: string }>;
  defaultQuery?: string;
  defaultCity?: string;
  /** Filtres déjà choisis, conservés lors d'une nouvelle recherche. */
  hidden?: Record<string, string>;
  className?: string;
}) {
  const texts = t.servicesPages;
  return (
    <Form
      action={routes.servicesSearch}
      role="search"
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-card sm:flex-row sm:items-center sm:rounded-full",
        className,
      )}
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="relative flex-1">
        <label htmlFor="services-q" className="sr-only">
          {t.services.searchLabel}
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="services-q"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder={texts.searchPlaceholder}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl bg-transparent pr-3 pl-11 text-control outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:rounded-full sm:text-base"
        />
      </div>
      <div className="relative sm:w-56 sm:border-l sm:border-border">
        <label htmlFor="services-city" className="sr-only">
          {texts.cityLabel}
        </label>
        <MapPin
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <select
          id="services-city"
          name="ville"
          defaultValue={defaultCity ?? ""}
          className="h-12 w-full appearance-none rounded-xl bg-muted pr-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:rounded-full sm:bg-transparent"
        >
          <option value="">{texts.allCities}</option>
          {cities.map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" className="sm:rounded-full">
        <Search aria-hidden="true" className="sm:hidden" />
        {texts.search}
      </Button>
    </Form>
  );
}
