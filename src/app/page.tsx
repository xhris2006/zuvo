import {
  ArrowRight,
  BadgePercent,
  HandCoins,
  MessagesSquare,
  PackageOpen,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/layout/section-header";
import { JsonLd } from "@/components/seo/json-ld";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { CategoryList } from "@/features/categories/components/category-list";
import { defaultCategories, getCategoryIcon } from "@/features/categories/data";
import { getCurrentUser } from "@/features/auth/session";
import { ListingResults } from "@/features/listings/components/listing-results";
import { getFollowedFeed, getRecentListings } from "@/features/listings/queries";
import type { ListingCardData } from "@/features/listings/types";
import { getDictionary } from "@/i18n";
import { getSiteUrl } from "@/lib/env";

const heroTiles = ["mode-femme", "telephones-tablettes", "chaussures", "maison"] as const;

function HeroIllustration() {
  const categories = heroTiles.map(
    (slug) => defaultCategories.find((category) => category.slug === slug) ?? { slug, name: slug },
  );
  return (
    <div aria-hidden="true" className="relative hidden pb-8 lg:block">
      <div className="absolute -inset-6 rounded-[2rem] bg-brand-100/70" />
      <div className="relative grid grid-cols-2 gap-4">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category.slug);
          return (
            <div
              key={category.slug}
              className={
                index % 2 === 1
                  ? "translate-y-8 rounded-2xl border border-border bg-card p-6 shadow-raised"
                  : "rounded-2xl border border-border bg-card p-6 shadow-raised"
              }
            >
              <div className="mb-10 flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-6" />
              </div>
              <p className="text-sm font-semibold">{category.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Données d'accueil : une indisponibilité ne doit pas empêcher l'affichage. */
async function loadHomeListings(userId: string | null): Promise<{
  recent: ListingCardData[];
  followed: ListingCardData[];
}> {
  try {
    const [recent, feed] = await Promise.all([
      getRecentListings(12),
      userId ? getFollowedFeed(userId, 1) : Promise.resolve(null),
    ]);
    return { recent, followed: feed?.items.slice(0, 8) ?? [] };
  } catch {
    return { recent: [], followed: [] };
  }
}

/** Présentation du site pour les visiteurs non connectés. */
function GuestHero() {
  const t = getDictionary();
  return (
    <section className="border-b border-border bg-gradient-to-b from-brand-50 to-background">
      <div className="container-page grid items-center gap-10 py-7 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div className="flex flex-col gap-3 sm:gap-5">
          <h1 className="max-w-xl text-[1.75rem] leading-tight font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
            {t.home.heroTitle}
          </h1>
          <p className="max-w-lg text-[0.9375rem] text-pretty text-muted-foreground sm:text-lg">
            {t.home.heroSubtitle}
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href={routes.sell}>
                <Plus aria-hidden="true" />
                {t.home.heroPrimary}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="hidden sm:inline-flex">
              <Link href={routes.explore}>
                {t.home.heroSecondary}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <HeroIllustration />
      </div>
    </section>
  );
}

/** Raccourci de mise en vente pour les membres connectés. */
function SellCard() {
  const t = getDictionary();
  return (
    <section aria-labelledby="sell-card-title" className="container-page">
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-4 text-white shadow-raised sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <h2 id="sell-card-title" className="font-semibold sm:text-lg">
            {t.home.sellCardTitle}
          </h2>
          <p className="text-sm text-brand-100">{t.home.sellCardBody}</p>
        </div>
        <Button
          asChild
          variant="secondary"
          className="bg-white text-brand-800 shadow-card hover:bg-brand-50"
        >
          <Link href={routes.sell}>
            <Plus aria-hidden="true" />
            {t.home.sellCardCta}
          </Link>
        </Button>
      </div>
    </section>
  );
}

export default async function HomePage(props: PageProps<"/">) {
  const t = getDictionary();
  const accountDeleted = (await props.searchParams).compte === "supprime";
  const user = await getCurrentUser().catch(() => null);
  const { recent, followed } = await loadHomeListings(user?.id ?? null);
  const values = [
    { icon: HandCoins, title: t.home.values.freeTitle, body: t.home.values.freeBody },
    { icon: BadgePercent, title: t.home.values.noFeeTitle, body: t.home.values.noFeeBody },
    { icon: MessagesSquare, title: t.home.values.directTitle, body: t.home.values.directBody },
  ];

  const siteUrl = getSiteUrl();

  return (
    <div
      className={
        user ? "flex flex-col gap-9 pt-4 sm:gap-14 sm:pt-8" : "flex flex-col gap-9 sm:gap-16"
      }
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          description: siteConfig.description,
          url: siteUrl,
          inLanguage: siteConfig.intlLocale,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteUrl}${routes.explore}?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {accountDeleted ? (
        <div className="container-page pt-4">
          <Alert variant="success" title="Compte supprimé" role="status">
            Votre compte et vos annonces ont été supprimés. Merci d&apos;avoir utilisé{" "}
            {siteConfig.name}.
          </Alert>
        </div>
      ) : null}

      {user ? (
        <>
          <h1 className="sr-only">{t.nav.home}</h1>
          <SellCard />
        </>
      ) : (
        <GuestHero />
      )}

      <section aria-labelledby="categories-title" className="container-page">
        <SectionHeader id="categories-title" title={t.home.categoriesTitle} href={routes.explore} />
        <CategoryList categories={defaultCategories} />
      </section>

      {followed.length > 0 ? (
        <section aria-labelledby="feed-title" className="container-page">
          <SectionHeader id="feed-title" title={t.home.followedTitle} href={routes.feed} />
          <ListingResults listings={followed.slice(0, 8)} layout="carousel" />
        </section>
      ) : null}

      <section aria-labelledby="recent-title" className="container-page">
        <SectionHeader
          id="recent-title"
          title={t.home.recentTitle}
          href={recent.length > 0 ? routes.explore : undefined}
        />
        {recent.length > 0 ? (
          <ListingResults listings={recent} priorityCount={4} />
        ) : (
          <EmptyState
            icon={PackageOpen}
            headingLevel="h3"
            title={t.home.recentEmptyTitle}
            description={t.home.recentEmptyBody}
            action={
              <Button asChild>
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  {t.nav.sellCta}
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <section aria-labelledby="values-title" className="container-page">
        <SectionHeader id="values-title" title={t.home.valueTitle} />
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {values.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 p-4 sm:flex-col sm:gap-0 sm:p-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground sm:mb-4">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page">
        <div className="flex flex-col gap-4 rounded-2xl bg-brand-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="size-5 text-brand-200" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold sm:text-lg">{t.home.safetyTitle}</h2>
              <p className="mt-1 max-w-xl text-sm text-brand-100">{t.home.safetyBody}</p>
            </div>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href={routes.safety}>{t.home.safetyCta}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
