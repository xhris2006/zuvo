import { Rss } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { routes } from "@/config/routes";
import { MemberGate } from "@/features/auth/components/member-gate";
import { getCurrentUser } from "@/features/auth/session";
import { FeedResults } from "@/features/listings/components/feed-results";
import { ListingResults } from "@/features/listings/components/listing-results";
import {
  type ListingView,
  ListingViewToggle,
  parseListingView,
} from "@/features/listings/components/listing-view";
import { getFeedListings } from "@/features/listings/feed";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Mon fil",
  robots: { index: false },
};

/** Adresse du fil pour une page et un mode d'affichage (le fil par défaut). */
function feedHref(page: number, view: ListingView) {
  const params = new URLSearchParams();
  if (view === "grille") params.set("vue", view);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.feed}?${query}` : routes.feed) as typeof routes.feed;
}

async function Feed({ page, view }: { page: number; view: ListingView }) {
  const user = await getCurrentUser();
  const feed = user ? await getFeedListings({ followerId: user.id, page }) : null;
  if (!feed || feed.items.length === 0) {
    return (
      <EmptyState
        icon={Rss}
        title="Votre fil est vide"
        description="Suivez des vendeurs pour voir ici leurs nouvelles annonces."
        action={
          <Button asChild>
            <Link href={routes.explore}>Découvrir des annonces</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      {view === "grille" ? (
        <ListingResults listings={feed.items} priorityCount={4} />
      ) : (
        <FeedResults listings={feed.items} />
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(feed.total / feed.pageSize)}
        hrefFor={(value) => feedHref(value, view)}
      />
    </>
  );
}

export default async function FeedPage(props: PageProps<"/fil">) {
  const searchParams = await props.searchParams;
  const page = parsePageParam(searchParams.page);
  const view = parseListingView(searchParams.vue);
  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title="Mon fil"
        description="Les dernières annonces des vendeurs que vous suivez."
        inlineActions
        actions={<ListingViewToggle current={view} hrefFor={(value) => feedHref(page, value)} />}
      />
      <MemberGate returnTo={routes.feed}>
        <Feed page={page} view={view} />
      </MemberGate>
    </div>
  );
}
