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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { CategoryList } from "@/features/categories/components/category-list";
import { defaultCategories, getCategoryIcon } from "@/features/categories/data";
import { getDictionary } from "@/i18n";

const heroTiles = ["mode-femme", "telephones-tablettes", "chaussures", "maison"] as const;

function HeroIllustration() {
  const categories = heroTiles.map(
    (slug) => defaultCategories.find((category) => category.slug === slug) ?? { slug, name: slug },
  );
  return (
    <div aria-hidden="true" className="relative hidden pb-8 lg:block">
      <div className="absolute -inset-6 rounded-[2rem] bg-sage-100/70" />
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

export default function HomePage() {
  const t = getDictionary();
  const values = [
    { icon: HandCoins, title: t.home.values.freeTitle, body: t.home.values.freeBody },
    { icon: BadgePercent, title: t.home.values.noFeeTitle, body: t.home.values.noFeeBody },
    { icon: MessagesSquare, title: t.home.values.directTitle, body: t.home.values.directBody },
  ];

  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      <section className="border-b border-border bg-gradient-to-b from-sage-50 to-background">
        <div className="container-page grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="flex flex-col gap-5">
            <h1 className="max-w-xl text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
              {t.home.heroTitle}
            </h1>
            <p className="max-w-lg text-base text-pretty text-muted-foreground sm:text-lg">
              {t.home.heroSubtitle}
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button asChild size="lg">
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  {t.home.heroPrimary}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
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

      <section aria-labelledby="categories-title" className="container-page">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="categories-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            {t.home.categoriesTitle}
          </h2>
          <Link
            href={routes.explore}
            className="text-sm font-semibold text-primary hover:text-primary-hover"
          >
            {t.common.seeAll}
          </Link>
        </div>
        <CategoryList categories={defaultCategories} />
      </section>

      <section aria-labelledby="recent-title" className="container-page">
        <h2 id="recent-title" className="mb-5 text-xl font-bold tracking-tight sm:text-2xl">
          {t.home.recentTitle}
        </h2>
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
      </section>

      <section aria-labelledby="values-title" className="container-page">
        <h2 id="values-title" className="mb-5 text-xl font-bold tracking-tight sm:text-2xl">
          {t.home.valueTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {values.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page">
        <div className="flex flex-col gap-4 rounded-2xl bg-sage-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-sage-200" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold">{t.home.safetyTitle}</h2>
              <p className="mt-1 max-w-xl text-sm text-sage-100">{t.home.safetyBody}</p>
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
