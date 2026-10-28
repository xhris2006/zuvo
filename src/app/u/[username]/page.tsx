import { LayoutGrid, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ShareButton } from "@/components/ui/share-button";
import { searchLimits } from "@/config/limits";
import { publicProfileHref, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { signInHref } from "@/features/auth/links";
import { getCurrentUser } from "@/features/auth/session";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { ListingResults } from "@/features/listings/components/listing-results";
import { getSellerListings } from "@/features/listings/queries";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { UserActionsMenu } from "@/features/moderation/components/user-actions-menu";
import { hasBlocked } from "@/features/moderation/queries";
import { FollowButton } from "@/features/profiles/components/follow-button";
import { ProfileHeader } from "@/features/profiles/components/profile-header";
import { ProfileTabs } from "@/features/profiles/components/profile-tabs";
import { getProfileByUsername, getProfileStats, isFollowing } from "@/features/profiles/queries";
import { USERNAME_PATTERN } from "@/features/profiles/username";
import { getT } from "@/i18n/server";
import { getSiteUrl } from "@/lib/env";

async function loadProfile(rawUsername: string) {
  const username = decodeURIComponent(rawUsername).toLowerCase();
  if (!USERNAME_PATTERN.test(username)) return null;
  return getProfileByUsername(username);
}

export async function generateMetadata(props: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const [profile, t] = await Promise.all([loadProfile(username), getT()]);
  if (!profile) return { title: t.profilePages.notFound, robots: { index: false } };
  const title = `${profile.display_name} (@${profile.username})`;
  const description =
    profile.bio?.slice(0, 160) ?? t.profilePages.discover(profile.display_name, siteConfig.name);
  const image = avatarUrl(profile.avatar_path);
  return {
    title,
    description,
    alternates: { canonical: publicProfileHref(profile.username) },
    openGraph: { title, description, type: "profile", images: image ? [image] : undefined },
  };
}

export default async function PublicProfilePage(props: PageProps<"/u/[username]">) {
  const [{ username }, searchParams] = await Promise.all([props.params, props.searchParams]);
  // Requêtes indépendantes lancées ensemble (pas d'attente en cascade).
  const [profile, viewer, t] = await Promise.all([loadProfile(username), getCurrentUser(), getT()]);
  if (!profile) notFound();

  const requestedPage = Number(searchParams.page);
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;

  const isOwnProfile = viewer?.id === profile.id;
  const [stats, following, blocked, listings] = await Promise.all([
    getProfileStats(profile.id),
    viewer && !isOwnProfile ? isFollowing(viewer.id, profile.id) : Promise.resolve(false),
    viewer && !isOwnProfile ? hasBlocked(viewer.id, profile.id) : Promise.resolve(false),
    getSellerListings(profile.id, page, searchLimits.pageSize),
  ]);
  const profilePath = publicProfileHref(profile.username);
  const pageCount = Math.ceil(listings.total / searchLimits.pageSize);

  let actions;
  let menu;
  const share = (
    <ShareButton
      title={`${profile.display_name} (@${profile.username})`}
      text={t.profilePages.discover(profile.display_name, siteConfig.name)}
      url={`${getSiteUrl()}${profilePath}`}
      label={t.profilePages.shareProfile}
      tone="soft"
      // 360 px : sans icône pour que les deux libellés tiennent sur une ligne.
      className="min-w-0 flex-1 max-[25rem]:px-2 max-[25rem]:[&_svg]:hidden"
    />
  );
  if (isOwnProfile) {
    actions = (
      <>
        <Button asChild variant="soft" size="sm" className="min-w-0 flex-1 max-[25rem]:px-2">
          <Link href={routes.editProfile}>
            <span className="truncate">{t.profilePages.editMine}</span>
          </Link>
        </Button>
        {share}
      </>
    );
  } else if (viewer) {
    actions = blocked ? (
      share
    ) : (
      <>
        <FollowButton
          profileId={profile.id}
          username={profile.username}
          initialFollowing={following}
          className="flex-1"
        />
        {share}
      </>
    );
    menu = (
      <UserActionsMenu
        user={{ id: profile.id, username: profile.username, displayName: profile.display_name }}
        initialBlocked={blocked}
        returnTo={profilePath}
      />
    );
  } else {
    actions = (
      <>
        <Button asChild size="sm" className="flex-1">
          <Link href={signInHref(profilePath)}>{t.profilePages.follow}</Link>
        </Button>
        {share}
      </>
    );
    menu = (
      <ReportDialog
        targetType="user"
        targetId={profile.id}
        signedIn={false}
        returnTo={profilePath}
        className="h-10 rounded-full px-3.5 text-foreground hover:bg-muted"
      />
    );
  }

  return (
    <div className="container-page flex max-w-4xl flex-col gap-5 sm:gap-7 lg:pt-6">
      <ProfileHeader
        profile={profile}
        stats={stats}
        actions={actions}
        trailing={menu}
        leading={
          <BackButton
            fallbackHref={routes.explore}
            className="bg-transparent shadow-none backdrop-blur-none hover:bg-muted"
          />
        }
      />
      <section aria-labelledby="profile-listings" className="flex flex-col gap-4">
        <ProfileTabs
          labelledBy="profile-listings"
          tabs={[
            {
              key: "on-sale",
              label: t.profile.onSale,
              count: listings.total,
              icon: LayoutGrid,
              current: true,
            },
          ]}
        />
        {listings.items.length > 0 ? (
          <>
            <ListingResults listings={listings.items} />
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefFor={(value) =>
                (value === 1 ? profilePath : `${profilePath}?page=${value}`) as typeof profilePath
              }
            />
          </>
        ) : (
          <EmptyState
            icon={PackageOpen}
            headingLevel="h3"
            title={t.profilePages.noneOnSaleTitle}
            description={t.profilePages.noneOnSaleBody(profile.display_name)}
          />
        )}
      </section>
    </div>
  );
}
