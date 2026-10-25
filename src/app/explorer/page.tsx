import { SearchX, Store, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { exploreHref, routes } from "@/config/routes";
import { ListingResults } from "@/features/listings/components/listing-results";
import { CategoryList } from "@/features/categories/components/category-list";
import { defaultCategories } from "@/features/categories/data";
import {
  type Category,
  getCategories,
  type SearchResult,
  searchListings,
} from "@/features/listings/queries";
import { ShopList } from "@/features/profiles/components/shop-list";
import { parseExploreTab, sanitizeShopQuery } from "@/features/profiles/shop-search";
import { type ShopSearchResult, searchShops } from "@/features/profiles/shops";
import { ActiveFilters } from "@/features/search/components/active-filters";
import { CategoryChips } from "@/features/search/components/category-chips";
import { ExploreTabs, exploreTabHref } from "@/features/search/components/explore-tabs";
import { FiltersForm } from "@/features/search/components/filters-form";
import { MobileFilters } from "@/features/search/components/mobile-filters";
import { ShopSearchForm } from "@/features/search/components/shop-search-form";
import { SortMenu } from "@/features/search/components/sort-menu";
import {
  countActiveFilters,
  parseSearchParams,
  sortOptions,
  toSearchParams,
} from "@/features/search/schema";
import { getDictionary } from "@/i18n";
import { getCities } from "@/features/locations/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { parsePageParam } from "@/lib/pagination";

export async function generateMetadata(props: PageProps<"/explorer">): Promise<Metadata> {
  const searchParams = await props.searchParams;
  if (parseExploreTab(searchParams.type) === "boutiques") {
    return {
      title: "Boutiques",
      description: getDictionary().explore.shopsDescription,
      alternates: { canonical: exploreTabHref("boutiques") },
      robots: sanitizeShopQuery(searchParams.q) ? { index: false } : undefined,
    };
  }
  const filters = parseSearchParams(searchParams);
  const category = filters.category
    ? (await getCategories().catch(() => [] as Category[])).find(
        (item) => item.slug === filters.category,
      )
    : undefined;
  return {
    title: category ? `${category.name} d'occasion` : "Explorer les annonces",
    description: "Recherchez des articles de seconde main par catégorie, ville, état et prix.",
    alternates: {
      canonical: category ? exploreHref(toSearchParams({ category: category.slug })) : "/explorer",
    },
    // Les pages de résultats de recherche libre ne sont pas indexées.
    robots: filters.q ? { index: false } : undefined,
  };
}

function resultLabel(total: number) {
  if (total === 0) return "Aucune annonce";
  return total === 1 ? "1 annonce" : `${total.toLocaleString("fr-FR")} annonces`;
}

/** Onglet « Boutiques » : recherche de vendeurs par nom ou pseudo. */
async function ShopsExplorer({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = getDictionary();
  const query = sanitizeShopQuery(searchParams.q);
  const page = parsePageParam(searchParams.page);
  let result: ShopSearchResult | null = null;
  let unavailable = false;
  if (isSupabaseConfigured()) {
    try {
      result = await searchShops({ q: query, page, pageSize: 24 });
    } catch {
      unavailable = true;
    }
  }
  const pageCount = result ? Math.ceil(result.total / result.pageSize) : 0;
  const pageHref = (value: number) => {
    const params = new URLSearchParams({ type: "boutiques" });
    if (query) params.set("q", query);
    if (value > 1) params.set("page", String(value));
    return exploreHref(params);
  };

  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={query ? t.explore.shopsResultsFor(query) : t.explore.shopsTitle}
        description={<span className="hidden sm:inline">{t.explore.shopsDescription}</span>}
      />
      <ExploreTabs current="boutiques" query={query} />
      <ShopSearchForm defaultValue={query} className="sm:max-w-md" />

      <section aria-labelledby="shops-count" className="flex flex-col gap-5">
        {unavailable ? (
          <EmptyState
            icon={WifiOff}
            title={t.explore.shopsUnavailableTitle}
            description="Le service ne répond pas pour le moment. Réessayez dans quelques instants."
          />
        ) : result === null ? (
          <EmptyState
            icon={Store}
            title={t.explore.unavailableTitle}
            description={t.explore.unavailableBody}
          />
        ) : (
          <>
            <p
              id="shops-count"
              className="text-sm font-medium text-muted-foreground"
              aria-live="polite"
            >
              {t.explore.shopsCount(result.total)}
            </p>
            {result.items.length > 0 ? (
              <>
                <ShopList shops={result.items} />
                <Pagination page={page} pageCount={pageCount} hrefFor={pageHref} />
              </>
            ) : (
              <EmptyState
                icon={Store}
                title={query ? t.explore.shopsEmptyTitle : t.explore.shopsNoneTitle}
                description={query ? t.explore.shopsEmptyBody : t.explore.shopsNoneBody}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default async function ExplorePage(props: PageProps<"/explorer">) {
  const t = getDictionary();
  const searchParams = await props.searchParams;
  if (parseExploreTab(searchParams.type) === "boutiques") {
    return <ShopsExplorer searchParams={searchParams} />;
  }
  const parsedFilters = parseSearchParams(searchParams);
  const cities = await getCities();
  // Ville inconnue ou désactivée : filtre ignoré, comme toute valeur invalide.
  const filters =
    parsedFilters.city && !cities.some((city) => city.slug === parsedFilters.city)
      ? { ...parsedFilters, city: undefined }
      : parsedFilters;
  const activeCount = countActiveFilters(filters);
  const configured = isSupabaseConfigured();
  // Une panne de la base ne doit pas rendre la page inutilisable : on garde
  // les filtres et on affiche un message à la place des résultats.
  let categories: Category[];
  let result: SearchResult | null = null;
  let unavailable = false;
  try {
    categories = await getCategories();
    if (configured) result = await searchListings(filters);
  } catch {
    categories = defaultCategories.map((category) => ({ ...category, id: null }));
    unavailable = true;
  }
  const pageCount = result ? Math.ceil(result.total / result.pageSize) : 0;

  const sortChoices = sortOptions.map((option) => ({
    label: t.explore.sortOptions[option],
    href: exploreHref(toSearchParams({ ...filters, sort: option, page: 1 })),
    active: filters.sort === option,
  }));

  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={filters.q ? `Résultats pour « ${filters.q} »` : t.explore.title}
        description={<span className="hidden sm:inline">{t.explore.description}</span>}
      />

      <ExploreTabs current="articles" query={filters.q} />

      {/* Sans recherche ni catégorie : les catégories en icônes ; sinon, des raccourcis. */}
      {!filters.q && !filters.category ? (
        <section aria-labelledby="categories-title">
          <h2 id="categories-title" className="mb-3 text-lg font-bold tracking-tight sm:text-xl">
            {t.home.categoriesTitle}
          </h2>
          <CategoryList categories={categories} filters={filters} />
        </section>
      ) : (
        <CategoryChips filters={filters} categories={categories} className="lg:hidden" />
      )}

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label={t.explore.filters} className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-card lg:top-6">
            <FiltersForm
              filters={filters}
              categories={categories}
              cities={cities}
              idPrefix="desktop"
            />
          </div>
        </aside>

        <section aria-labelledby="results-count" className="flex flex-col gap-5">
          <div className="flex min-h-9 items-center gap-2">
            {result ? (
              <p
                id="results-count"
                className="mr-auto text-sm font-medium text-muted-foreground"
                aria-live="polite"
              >
                {resultLabel(result.total)}
              </p>
            ) : (
              <span className="mr-auto" />
            )}
            <SortMenu label={t.explore.sort} options={sortChoices} className="lg:hidden" />
            <MobileFilters
              label={t.explore.filters}
              description={t.explore.description}
              activeCount={activeCount}
            >
              <FiltersForm
                filters={filters}
                categories={categories}
                cities={cities}
                idPrefix="mobile"
              />
            </MobileFilters>
          </div>
          <ActiveFilters filters={filters} categories={categories} />
          {unavailable ? (
            <EmptyState
              icon={WifiOff}
              title="Annonces momentanément indisponibles"
              description="Le service ne répond pas pour le moment. Réessayez dans quelques instants."
            />
          ) : result === null ? (
            <EmptyState
              icon={SearchX}
              title={t.explore.unavailableTitle}
              description={t.explore.unavailableBody}
            />
          ) : (
            <>
              {result.items.length > 0 ? (
                <>
                  <ListingResults listings={result.items} priorityCount={4} />
                  <Pagination
                    page={filters.page}
                    pageCount={pageCount}
                    hrefFor={(page) => exploreHref(toSearchParams({ ...filters, page }))}
                  />
                </>
              ) : (
                <EmptyState
                  icon={SearchX}
                  title={t.explore.emptyTitle}
                  description={t.explore.emptyBody}
                  action={
                    activeCount > 0 ? (
                      <Button asChild variant="outline">
                        <Link href={routes.explore}>{t.explore.resetFilters}</Link>
                      </Button>
                    ) : null
                  }
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
