import { Plus, SearchX, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/features/auth/session";
import { getCities } from "@/features/locations/queries";
import { localizedServiceCategory } from "@/features/services/categories";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceFavoriteButton } from "@/features/services/components/service-favorite-button";
import { ServiceFilters } from "@/features/services/components/service-filters";
import { ServiceGrid } from "@/features/services/components/service-grid";
import { ServiceSearchBar } from "@/features/services/components/service-search-bar";
import { serviceSearchHref } from "@/features/services/links";
import {
  getServiceCategories,
  getServiceFavoriteIds,
  searchServices,
} from "@/features/services/queries";
import {
  countServiceFilters,
  parseServiceSearchParams,
  serviceSearchParams,
} from "@/features/services/schemas";
import type { ServiceCardData } from "@/features/services/types";
import { getT } from "@/i18n/server";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/services/recherche">): Promise<Metadata> {
  const t = await getT();
  const filters = parseServiceSearchParams(await props.searchParams);
  const category = filters.category
    ? (await getServiceCategories()).find((item) => item.slug === filters.category)
    : undefined;
  const name = category
    ? localizedServiceCategory(t.serviceCategoryNames, category).name
    : undefined;
  // Pages indexées : la recherche sans filtre et chaque catégorie seule.
  const onlyCategory = countServiceFilters(filters) === (category ? 1 : 0);
  return {
    ...publicPageMetadata({
      title: name ? t.servicesPages.categoryMetaTitle(name) : t.servicesPages.searchTitle,
      description: name
        ? t.servicesPages.categoryMetaDescription(name, siteConfig.name)
        : t.servicesPages.metaDescription(siteConfig.name),
      path: category
        ? serviceSearchHref(serviceSearchParams({ category: category.slug }))
        : routes.servicesSearch,
    }),
    robots: filters.q || !onlyCategory ? { index: false } : undefined,
  };
}

/** Recherche de services : texte, filtres avancés, tri et pagination. */
export default async function ServiceSearchPage(props: PageProps<"/services/recherche">) {
  const [t, viewer, searchParams] = await Promise.all([
    getT(),
    getCurrentUser(),
    props.searchParams,
  ]);
  const texts = t.servicesPages;
  const filters = parseServiceSearchParams(searchParams);
  const [categories, cities] = await Promise.all([getServiceCategories(), getCities()]);

  let result: { items: ServiceCardData[]; total: number; pageSize: number } | null = null;
  try {
    result = await searchServices(filters);
  } catch {
    result = null;
  }
  const favoriteIds = await getServiceFavoriteIds(
    viewer?.id ?? null,
    (result?.items ?? []).map((service) => service.id),
  );
  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const returnTo = serviceSearchHref(serviceSearchParams(filters));
  // La recherche par texte conserve les autres filtres (sauf la ville, choisie dans la barre).
  const kept = Object.fromEntries(
    serviceSearchParams({ ...filters, q: undefined, city: undefined, page: 1 }).entries(),
  );

  return (
    <div className="container-page flex flex-col gap-5 pt-4 pb-6 sm:gap-6 sm:pt-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{texts.searchTitle}</h1>
        <ServiceSearchBar
          key={`${filters.q ?? ""}|${filters.city ?? ""}`}
          t={t}
          cities={cities}
          defaultQuery={filters.q}
          defaultCity={filters.city}
          hidden={kept}
        />
      </header>

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <ServiceFilters t={t} filters={filters} categories={categories} cities={cities} />

        <section aria-labelledby="service-results" className="flex flex-col gap-4">
          <h2 id="service-results" className="text-sm font-semibold text-muted-foreground">
            {result ? texts.resultsCount(result.total, t.format.count(result.total)) : null}
          </h2>
          {!result ? (
            <EmptyState
              icon={WifiOff}
              title={texts.unavailableTitle}
              description={texts.unavailableBody}
            />
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={texts.noResultsTitle}
              description={texts.noResultsBody}
              action={
                <Link
                  href={routes.publishService}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Plus aria-hidden="true" />
                  {texts.noResultsPublish}
                </Link>
              }
            />
          ) : (
            <>
              <ServiceGrid className="lg:grid-cols-2 xl:grid-cols-3">
                {result.items.map((service, index) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    priority={index < 2}
                    action={
                      <ServiceFavoriteButton
                        serviceId={service.id}
                        initialFavorited={favoriteIds.has(service.id)}
                        signedIn={Boolean(viewer)}
                        returnTo={returnTo}
                      />
                    }
                  />
                ))}
              </ServiceGrid>
              <Pagination
                page={Math.min(filters.page, pageCount)}
                pageCount={pageCount}
                hrefFor={(page) => serviceSearchHref(serviceSearchParams({ ...filters, page }))}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
