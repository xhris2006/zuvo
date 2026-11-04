import { BriefcaseBusiness, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/layout/section-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/features/auth/session";
import { getCities } from "@/features/locations/queries";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceCategoryGrid } from "@/features/services/components/service-category-grid";
import { ServiceFavoriteButton } from "@/features/services/components/service-favorite-button";
import { ServiceGrid } from "@/features/services/components/service-grid";
import { ServiceSearchBar } from "@/features/services/components/service-search-bar";
import {
  getFeaturedServices,
  getRecentServices,
  getServiceCategories,
  getServiceFavoriteIds,
} from "@/features/services/queries";
import { getT } from "@/i18n/server";
import { publicPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return publicPageMetadata({
    title: t.servicesPages.metaTitle,
    description: t.servicesPages.metaDescription(siteConfig.name),
    path: routes.services,
  });
}

/** Accueil de l'espace Services : recherche, catégories, services à la une et récents. */
export default async function ServicesHomePage() {
  const [t, viewer] = await Promise.all([getT(), getCurrentUser()]);
  const texts = t.servicesPages;
  const [categories, cities, featured, recent] = await Promise.all([
    getServiceCategories(),
    getCities(),
    getFeaturedServices(8).catch(() => []),
    getRecentServices(8).catch(() => []),
  ]);
  const favoriteIds = await getServiceFavoriteIds(
    viewer?.id ?? null,
    [...featured, ...recent].map((service) => service.id),
  );
  const favoriteAction = (serviceId: string) => (
    <ServiceFavoriteButton
      serviceId={serviceId}
      initialFavorited={favoriteIds.has(serviceId)}
      signedIn={Boolean(viewer)}
      returnTo={routes.services}
    />
  );

  return (
    <div className="flex flex-col gap-10 pb-6 sm:gap-14">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-50 to-background dark:from-brand-950/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative container-page flex max-w-4xl flex-col items-center gap-5 py-8 text-center sm:py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary-ink">
            <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
            {t.spaces.services}
          </span>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {texts.heroTitle}
          </h1>
          <p className="max-w-2xl text-base text-balance text-muted-foreground sm:text-lg">
            {texts.heroSubtitle}
          </p>
          <ServiceSearchBar t={t} cities={cities} className="mt-1" />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <Link
              href={routes.servicesSearch}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "sm:min-w-52")}
            >
              <Search aria-hidden="true" />
              {texts.findService}
            </Link>
            <Link
              href={routes.publishService}
              className={cn(buttonVariants({ size: "lg" }), "sm:min-w-52")}
            >
              <Plus aria-hidden="true" />
              {texts.publishService}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="service-categories" className="container-page">
        <SectionHeader id="service-categories" title={texts.categoriesTitle} />
        <ServiceCategoryGrid t={t} categories={categories} />
      </section>

      {featured.length > 0 ? (
        <section aria-labelledby="featured-services" className="container-page">
          <SectionHeader
            id="featured-services"
            title={texts.featuredTitle}
            description={texts.featuredHint}
          />
          <ServiceGrid>
            {featured.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                priority={index < 2}
                action={favoriteAction(service.id)}
              />
            ))}
          </ServiceGrid>
        </section>
      ) : null}

      <section aria-labelledby="recent-services" className="container-page">
        <SectionHeader
          id="recent-services"
          title={texts.recentTitle}
          href={recent.length > 0 ? routes.servicesSearch : undefined}
          linkLabel={texts.seeAll}
        />
        {recent.length > 0 ? (
          <ServiceGrid>
            {recent.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                priority={featured.length === 0 && index < 2}
                action={favoriteAction(service.id)}
              />
            ))}
          </ServiceGrid>
        ) : (
          <EmptyState
            icon={BriefcaseBusiness}
            title={texts.emptyTitle}
            description={texts.emptyBody(siteConfig.name)}
            action={
              <Link href={routes.publishService} className={buttonVariants()}>
                <Plus aria-hidden="true" />
                {texts.publishService}
              </Link>
            }
          />
        )}
      </section>

      <section aria-labelledby="services-how" className="container-page">
        <h2 id="services-how" className="mb-4 text-xl font-bold tracking-tight">
          {texts.howTitle}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {texts.howSteps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
