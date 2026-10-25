import { Eye, Heart, PackageOpen, Pencil, Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { publicProfileHref, routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { ListingResults } from "@/features/listings/components/listing-results";
import { getFavoriteListings, getOwnListings } from "@/features/listings/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { AvatarQuickEdit } from "@/features/profiles/components/avatar-quick-edit";
import { OwnProfileMenu } from "@/features/profiles/components/own-profile-menu";
import { ProfileHeader } from "@/features/profiles/components/profile-header";
import { ProfileTabs } from "@/features/profiles/components/profile-tabs";
import { getProfileById, getProfileStats } from "@/features/profiles/queries";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";
import { parsePageParam } from "@/lib/pagination";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.profilePages.myProfile, robots: { index: false } };
}

export default async function ProfilePage(props: PageProps<"/profil">) {
  const searchParams = await props.searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
        <PageHeader title="Profil" />
        <AuthRequired returnTo={routes.profile} />
      </div>
    );
  }

  const { user } = await requireUser(routes.profile);
  const profile = await getProfileById(user.id);
  // Profil absent : compte supprimé entre-temps ou incohérence ; on repart de zéro.
  if (!profile) redirect(routes.signIn);
  // Onglet « Favoris » affiché sur la page même, comme les annonces.
  const tab = searchParams.onglet === "favoris" ? "favorites" : "listings";
  const favoritesPage = tab === "favorites" ? parsePageParam(searchParams.page) : 1;
  const [stats, listings, favorites] = await Promise.all([
    getProfileStats(user.id),
    getOwnListings(user.id),
    getFavoriteListings(user.id, favoritesPage),
  ]);
  const t = await getT();
  const favoritesHref = (page: number) =>
    (page > 1
      ? `${routes.profileFavorites}&page=${page}`
      : routes.profileFavorites) as typeof routes.profileFavorites;

  return (
    <div className="container-page flex max-w-4xl flex-col gap-8 pt-5 sm:gap-10 sm:pt-10">
      <ProfileHeader
        profile={profile}
        stats={stats}
        avatar={
          <AvatarQuickEdit
            userId={user.id}
            name={profile.display_name}
            currentUrl={avatarUrl(profile.avatar_path)}
            avatarClassName="size-24 text-2xl sm:size-28 sm:text-3xl"
            messageClassName="top-auto bottom-1 left-full ml-3"
          />
        }
        back={<BackButton fallbackHref={routes.home} />}
        menu={<OwnProfileMenu username={profile.username} />}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={routes.editProfile}>
                <Pencil aria-hidden="true" />
                {t.profilePages.edit}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={publicProfileHref(profile.username)}>
                <Eye aria-hidden="true" />
                {t.profilePages.publicProfile}
              </Link>
            </Button>
          </>
        }
      />

      <section aria-labelledby="profile-tab" className="flex flex-col gap-4">
        <ProfileTabs
          labelledBy="profile-tab"
          tabs={[
            tab === "listings"
              ? {
                  key: "listings",
                  label: t.profile.myListings,
                  count: listings.length,
                  current: true,
                }
              : {
                  key: "listings",
                  label: t.profile.myListings,
                  count: listings.length,
                  href: routes.profile as Route,
                },
            tab === "favorites"
              ? {
                  key: "favorites",
                  label: t.profile.favorites,
                  count: favorites.total,
                  current: true,
                }
              : {
                  key: "favorites",
                  label: t.profile.favorites,
                  count: favorites.total,
                  href: routes.profileFavorites,
                },
          ]}
          trailing={
            tab === "listings" && listings.length > 0 ? (
              <Button asChild size="sm">
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  <span className="max-[359px]:sr-only">{t.profilePages.sell}</span>
                </Link>
              </Button>
            ) : null
          }
        />
        {searchParams.annonce === "supprimee" ? (
          <Alert variant="success">{t.profilePages.listingDeleted}</Alert>
        ) : null}
        {tab === "favorites" ? (
          favorites.items.length > 0 ? (
            <>
              <ListingResults listings={favorites.items} />
              <Pagination
                page={favoritesPage}
                pageCount={Math.ceil(favorites.total / favorites.pageSize)}
                hrefFor={favoritesHref}
              />
            </>
          ) : (
            <EmptyState
              icon={Heart}
              headingLevel="h3"
              title={t.profile.favoritesEmptyTitle}
              description={t.profile.favoritesEmptyBody}
              action={
                <Button asChild>
                  <Link href={routes.explore}>{t.profile.favoritesEmptyCta}</Link>
                </Button>
              }
            />
          )
        ) : listings.length > 0 ? (
          <ListingResults listings={listings} />
        ) : (
          <EmptyState
            icon={PackageOpen}
            headingLevel="h3"
            title={t.profilePages.noListingsTitle}
            description={t.profilePages.noListingsBody}
            action={
              <Button asChild>
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  {t.profilePages.sellItem}
                </Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
