import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { ListingResults } from "@/features/listings/components/listing-results";
import { getFavoriteListings } from "@/features/listings/queries";
import { getDictionary } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/env";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Favoris",
  robots: { index: false },
};

export default async function FavoritesPage(props: PageProps<"/favoris">) {
  const t = getDictionary();
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
        <PageHeader title={t.pages.favoritesTitle} />
        <AuthRequired returnTo={routes.favorites} />
      </div>
    );
  }

  const { user } = await requireUser(routes.favorites);
  const page = parsePageParam((await props.searchParams).page);
  const favorites = await getFavoriteListings(user.id, page);

  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader title={t.pages.favoritesTitle} />
      {favorites.items.length > 0 ? (
        <>
          <ListingResults listings={favorites.items} />
          <Pagination
            page={page}
            pageCount={Math.ceil(favorites.total / favorites.pageSize)}
            hrefFor={(value) =>
              (value === 1
                ? routes.favorites
                : `${routes.favorites}?page=${value}`) as typeof routes.favorites
            }
          />
        </>
      ) : (
        <EmptyState
          icon={Heart}
          title="Aucun favori"
          description="Touchez le cœur d'une annonce pour la retrouver facilement ici."
          action={
            <Button asChild>
              <Link href={routes.explore}>Explorer les annonces</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
