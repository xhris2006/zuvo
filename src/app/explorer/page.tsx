import { SearchX, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { exploreHref, routes } from "@/config/routes";
import { ListingResults } from "@/features/listings/components/listing-results";
import { defaultCategories } from "@/features/categories/data";
import {
  type Category,
  getCategories,
  type SearchResult,
  searchListings,
} from "@/features/listings/queries";
import { ActiveFilters } from "@/features/search/components/active-filters";
import { FiltersForm } from "@/features/search/components/filters-form";
import { MobileFilters } from "@/features/search/components/mobile-filters";
import { countActiveFilters, parseSearchParams, toSearchParams } from "@/features/search/schema";
import { getDictionary } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(props: PageProps<"/explorer">): Promise<Metadata> {
  const filters = parseSearchParams(await props.searchParams);
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

export default async function ExplorePage(props: PageProps<"/explorer">) {
  const t = getDictionary();
  const filters = parseSearchParams(await props.searchParams);
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

  return (
    <div className="container-page flex flex-col gap-6 pt-6 sm:pt-10">
      <PageHeader
        title={filters.q ? `Résultats pour « ${filters.q} »` : t.explore.title}
        description={t.explore.description}
        actions={
          <MobileFilters
            label={t.explore.filters}
            description={t.explore.description}
            activeCount={activeCount}
          >
            <FiltersForm filters={filters} categories={categories} idPrefix="mobile" />
          </MobileFilters>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label={t.explore.filters} className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-card">
            <FiltersForm filters={filters} categories={categories} idPrefix="desktop" />
          </div>
        </aside>

        <section aria-labelledby="results-count" className="flex flex-col gap-5">
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
              <p id="results-count" className="text-sm text-muted-foreground" aria-live="polite">
                {resultLabel(result.total)}
              </p>
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
