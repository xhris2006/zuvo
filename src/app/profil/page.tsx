import { Heart, LayoutGrid, PackageOpen, Plus, Settings } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationsLink } from "@/components/layout/notifications-link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AutoDismiss } from "@/components/ui/auto-dismiss";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ShareButton } from "@/components/ui/share-button";
import { publicProfileHref, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { isCurrentUserStaff } from "@/features/admin/queries";
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
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
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
  const [stats, listings, favorites, isStaff] = await Promise.all([
    getProfileStats(user.id),
    getOwnListings(user.id),
    getFavoriteListings(user.id, favoritesPage),
    isCurrentUserStaff(),
  ]);
  const t = await getT();
  const favoritesHref = (page: number) =>
    (page > 1
      ? `${routes.profileFavorites}&page=${page}`
      : routes.profileFavorites) as typeof routes.profileFavorites;

  return (
    <div className="container-page flex max-w-4xl flex-col gap-5 sm:gap-7 lg:pt-6">
      <ProfileHeader
        profile={profile}
        stats={stats}
        avatar={
          <AvatarQuickEdit
            userId={user.id}
            name={profile.display_name}
            currentUrl={avatarUrl(profile.avatar_path)}
            avatarClassName="size-[4.5rem] text-xl min-[25rem]:size-20 sm:size-28 sm:text-3xl"
            messageClassName="top-auto bottom-1 left-full ml-3"
          />
        }
        leading={
          <Link
            href={routes.sell}
            aria-label={t.profilePages.sellItem}
            title={t.profilePages.sellItem}
            className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="size-6" strokeWidth={2} aria-hidden="true" />
          </Link>
        }
        trailing={
          <>
            <NotificationsLink />
            <OwnProfileMenu username={profile.username} isStaff={isStaff} />
          </>
        }
        actions={
          <>
            <Button asChild variant="soft" size="sm" className="min-w-0 flex-1 max-[25rem]:px-2">
              <Link href={routes.editProfile}>
                <span className="truncate">{t.profilePages.editMine}</span>
              </Link>
            </Button>
            <ShareButton
              title={`${profile.display_name} (@${profile.username})`}
              text={t.profilePages.discover(profile.display_name, siteConfig.name)}
              url={`${getSiteUrl()}${publicProfileHref(profile.username)}`}
              label={t.profilePages.shareProfile}
              tone="soft"
              // 360 px : sans icône pour que les deux libellés tiennent sur une ligne.
              className="min-w-0 flex-1 max-[25rem]:px-2 max-[25rem]:[&_svg]:hidden"
            />
            <Button asChild variant="soft" size="icon-sm" className="shrink-0">
              <Link
                href={routes.settings}
                aria-label={t.profile.settings}
                title={t.profile.settings}
              >
                <Settings aria-hidden="true" />
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
                  icon: LayoutGrid,
                  current: true,
                }
              : {
                  key: "listings",
                  label: t.profile.myListings,
                  count: listings.length,
                  icon: LayoutGrid,
                  href: routes.profile as Route,
                },
            tab === "favorites"
              ? {
                  key: "favorites",
                  label: t.profile.favorites,
                  count: favorites.total,
                  icon: Heart,
                  current: true,
                }
              : {
                  key: "favorites",
                  label: t.profile.favorites,
                  count: favorites.total,
                  icon: Heart,
                  href: routes.profileFavorites,
                },
          ]}
        />
        {searchParams.annonce === "supprimee" ? (
          <AutoDismiss>
            <Alert variant="success">{t.profilePages.listingDeleted}</Alert>
          </AutoDismiss>
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
