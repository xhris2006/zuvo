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
import { ListingResults } from "@/features/listings/components/listing-results";
import { getFollowedFeed } from "@/features/listings/queries";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Mon fil",
  robots: { index: false },
};

async function Feed({ page }: { page: number }) {
  const user = await getCurrentUser();
  const feed = user ? await getFollowedFeed(user.id, page) : null;
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
      <ListingResults listings={feed.items} />
      <Pagination
        page={page}
        pageCount={Math.ceil(feed.total / feed.pageSize)}
        hrefFor={(value) =>
          (value === 1 ? routes.feed : `${routes.feed}?page=${value}`) as typeof routes.feed
        }
      />
    </>
  );
}

export default async function FeedPage(props: PageProps<"/fil">) {
  const page = parsePageParam((await props.searchParams).page);
  return (
    <div className="container-page flex flex-col gap-6 pt-6 sm:pt-10">
      <PageHeader
        title="Mon fil"
        description="Les dernières annonces des vendeurs que vous suivez."
      />
      <MemberGate returnTo={routes.feed}>
        <Feed page={page} />
      </MemberGate>
    </div>
  );
}
