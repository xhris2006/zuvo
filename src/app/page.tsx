import { PackageOpen, Plus, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { FeedResults } from "@/features/listings/components/feed-results";
import { ListingResults } from "@/features/listings/components/listing-results";
import { ListingViewToggle, parseListingView } from "@/features/listings/components/listing-view";
import { type FeedListingData, getFeedListings } from "@/features/listings/feed";
import { getFollowedFeed } from "@/features/listings/queries";
import type { ListingCardData } from "@/features/listings/types";
import { getDictionary } from "@/i18n";

/**
 * Données d'accueil : une indisponibilité ne doit pas empêcher l'affichage.
 * Annonces récentes avec leur vendeur (fil) et nouveautés des profils suivis.
 */
async function loadHomeListings(userId: string): Promise<{
  recent: FeedListingData[];
  followed: ListingCardData[];
}> {
  try {
    const [recent, followed] = await Promise.all([
      getFeedListings({ pageSize: 12 }),
      getFollowedFeed(userId, 1),
    ]);
    return { recent: recent.items, followed: followed.items.slice(0, 8) };
  } catch {
    return { recent: [], followed: [] };
  }
}

/** Accueil des membres connectés ; les visiteurs sont dirigés vers la page de bienvenue. */
export default async function HomePage(props: PageProps<"/">) {
  const t = getDictionary();
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(routes.welcome);
  const view = parseListingView((await props.searchParams).vue);
  const { recent, followed } = await loadHomeListings(user.id);

  return (
    <div className="flex flex-col gap-8 pt-4 sm:gap-12 sm:pt-8">
      <h1 className="sr-only">{t.nav.home}</h1>

      {followed.length > 0 ? (
        <section aria-labelledby="feed-title" className="container-page">
          <SectionHeader id="feed-title" title={t.home.followedTitle} href={routes.feed} />
          <ListingResults listings={followed} layout="carousel" />
        </section>
      ) : null}

      <section aria-labelledby="recent-title" className="container-page">
        <div className="mb-4 flex items-end gap-3 sm:mb-5">
          <SectionHeader
            id="recent-title"
            title={t.home.recentTitle}
            href={recent.length > 0 ? routes.explore : undefined}
            className="mb-0 min-w-0 flex-1 sm:mb-0"
          />
          {recent.length > 0 ? (
            <ListingViewToggle
              current={view}
              hrefFor={(value) => (value === "grille" ? "/?vue=grille" : routes.home) as Route}
            />
          ) : null}
        </div>
        {recent.length === 0 ? (
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
        ) : view === "fil" ? (
          <FeedResults listings={recent} />
        ) : (
          <ListingResults listings={recent} priorityCount={4} />
        )}
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
