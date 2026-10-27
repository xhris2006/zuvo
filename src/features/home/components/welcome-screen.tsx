import {
  ArrowRight,
  Banknote,
  Gift,
  MessageCircle,
  PackageOpen,
  Percent,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, Fragment, type ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo";
import { SearchForm } from "@/components/layout/search-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { CategoryList } from "@/features/categories/components/category-list";
import type { CategorySummary } from "@/features/categories/data";
import { ListingResults } from "@/features/listings/components/listing-results";
import type { ListingCardData } from "@/features/listings/types";
import { getT } from "@/i18n/server";
import { ListingMosaic } from "./listing-mosaic";
import { WelcomeFooter } from "./welcome-footer";
import { WelcomeHeader } from "./welcome-header";

/** Décalage d'une valeur d'entrée (variable CSS --reveal-delay). */
const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

/** Annonces récentes affichées dans la grille de l'accueil. */
const RECENT_COUNT = 8;

function SectionTitle({
  id,
  title,
  subtitle,
  action,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <h2
          id={id}
          className="reveal-on-scroll-blur text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Page d'accueil des visiteurs (page autonome, avec son propre en-tête et pied
 * de page) : slogan, recherche, catégories réellement disponibles, annonces
 * récentes, appel à publier et présentation de MboaDeal. Les membres connectés
 * arrivent directement sur leur accueil personnalisé.
 */
export async function WelcomeScreen({
  listings,
  categories,
  notice,
}: {
  listings: ListingCardData[];
  categories: readonly CategorySummary[];
  /** Message affiché au-dessus du titre (ex. compte supprimé). */
  notice?: ReactNode;
}) {
  const t = await getT();
  const words = t.home.heroTitle.split(" ");
  // Le sous-titre, la recherche et les boutons suivent la fin de la révélation du titre.
  const afterTitle = 350 + words.length * 75;
  const recent = listings.slice(0, RECENT_COUNT);
  const points = [
    { icon: Gift, title: t.welcome.aboutPoints.freeTitle, body: t.welcome.aboutPoints.freeBody },
    {
      icon: Percent,
      title: t.welcome.aboutPoints.noFeeTitle,
      body: t.welcome.aboutPoints.noFeeBody,
    },
    {
      icon: MessageCircle,
      title: t.welcome.aboutPoints.directTitle,
      body: t.welcome.aboutPoints.directBody,
    },
    {
      icon: Banknote,
      title: t.welcome.aboutPoints.fcfaTitle,
      body: t.welcome.aboutPoints.fcfaBody,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <WelcomeHeader />

      <section
        aria-labelledby="welcome-title"
        className="welcome-backdrop relative overflow-hidden"
      >
        {/* Lumière : halos orange qui dérivent et point lumineux près de la mosaïque. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="light-orb -top-40 -right-40 size-[36rem] lg:top-[-6rem] lg:right-[-4rem] lg:size-[46rem]" />
          <span className="light-orb -bottom-48 -left-40 size-[30rem] [--orb-color:var(--orb-color-soft)] [--orb-duration:24s]" />
          <span className="light-spark top-[14%] right-[22%] hidden lg:top-[16%] lg:right-[38%] lg:block" />
        </div>
        <div className="relative container-page grid gap-10 pt-9 pb-12 sm:pt-14 sm:pb-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:py-14">
          <div className="flex flex-col gap-5 lg:gap-6">
            {notice}
            <h1
              id="welcome-title"
              className="max-w-xl text-[2rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              {words.map((word, index) => (
                <Fragment key={index}>
                  <span
                    className="reveal-word"
                    style={{ "--i": index, "--reveal-delay": "200ms" } as CSSProperties}
                  >
                    {word}
                  </span>
                  {index < words.length - 1 ? " " : null}
                </Fragment>
              ))}
            </h1>
            <p
              className="max-w-lg reveal text-base text-pretty text-muted-foreground sm:text-lg"
              style={delay(afterTitle - 150)}
            >
              {t.home.heroSubtitle}
            </p>
            <div className="max-w-xl reveal-up" style={delay(afterTitle)}>
              <SearchForm
                id="welcome-search"
                className="[&_input]:h-12 [&_input]:bg-card [&_input]:shadow-card"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="reveal-up rounded-full shadow-raised sm:min-w-52"
                style={delay(afterTitle + 100)}
              >
                <Link href={routes.explore}>
                  <Search aria-hidden="true" />
                  {t.welcome.discover}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="reveal-up rounded-full bg-card/70 backdrop-blur sm:min-w-52"
                style={delay(afterTitle + 200)}
              >
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  {t.welcome.publish}
                </Link>
              </Button>
            </div>
            <Link
              href={routes.signIn}
              className="group inline-flex reveal-up items-center gap-1 self-start rounded-md px-1 py-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
              style={delay(afterTitle + 300)}
            >
              {t.welcome.signIn}
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
          <ListingMosaic listings={listings} className="hidden lg:block" />
        </div>
      </section>

      <div className="flex flex-col gap-14 py-12 sm:gap-20 sm:py-16">
        <section
          id="categories"
          aria-labelledby="categories-title"
          className="container-page scroll-mt-20"
        >
          <SectionTitle
            id="categories-title"
            title={t.home.categoriesTitle}
            subtitle={t.welcome.categoriesSubtitle}
          />
          <CategoryList categories={categories} />
        </section>

        <section aria-labelledby="recent-title" className="container-page">
          <SectionTitle
            id="recent-title"
            title={t.welcome.recentTitle}
            subtitle={t.welcome.recentSubtitle}
            action={
              recent.length > 0 ? (
                <Link
                  href={routes.explore}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-1 text-sm font-semibold text-primary-ink hover:text-primary-ink-hover"
                >
                  {t.common.seeAll}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null
            }
          />
          {recent.length > 0 ? (
            <ListingResults listings={recent} priorityCount={4} />
          ) : (
            <EmptyState
              icon={PackageOpen}
              headingLevel="h3"
              title={t.welcome.recentEmptyTitle}
              description={t.welcome.recentEmptyBody}
              action={
                <Button asChild>
                  <Link href={routes.sell}>
                    <Plus aria-hidden="true" />
                    {t.welcome.publish}
                  </Link>
                </Button>
              }
            />
          )}
        </section>

        <section aria-labelledby="free-title" className="container-page">
          <div className="reveal-on-scroll relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-500 px-6 py-9 text-primary-foreground shadow-raised sm:px-10 sm:py-11 lg:flex-row lg:items-center lg:justify-between">
            <LogoMark
              tone="white"
              className="pointer-events-none absolute -right-10 -bottom-14 size-56 opacity-25 sm:size-72"
            />
            <div className="relative max-w-xl">
              <h2 id="free-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {t.welcome.freeTitle}
              </h2>
              <p className="mt-2 text-base font-medium sm:text-lg">{t.welcome.freeBody}</p>
            </div>
            <div className="relative flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-inverse text-inverse-foreground shadow-raised hover:bg-inverse/90 hover:shadow-raised"
              >
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  {t.welcome.publish}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-inverse/25 bg-white/35 text-inverse hover:bg-white/55"
              >
                <Link href={routes.signUp}>{t.common.signUp}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-title" className="container-page">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr] lg:items-center lg:gap-14">
            <div className="flex flex-col gap-3">
              <h2
                id="about-title"
                className="reveal-on-scroll-blur text-2xl font-extrabold tracking-tight text-balance sm:text-3xl"
              >
                {t.welcome.aboutTitle}
              </h2>
              <p className="text-base text-muted-foreground">{t.welcome.aboutBody}</p>
              <Link
                href={routes.safety}
                className="group mt-1 inline-flex items-center gap-1 self-start rounded-md py-1 text-sm font-semibold text-primary-ink hover:text-primary-ink-hover"
              >
                {t.welcome.safetyLink}
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {points.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="reveal-on-scroll flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <WelcomeFooter />
    </div>
  );
}
