import { PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { searchLimits } from "@/config/limits";
import { publicProfileHref, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { signInHref } from "@/features/auth/links";
import { getCurrentUser } from "@/features/auth/session";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { ListingResults } from "@/features/listings/components/listing-results";
import { getSellerListings } from "@/features/listings/queries";
import { BlockButton } from "@/features/moderation/components/block-button";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { hasBlocked } from "@/features/moderation/queries";
import { FollowButton } from "@/features/profiles/components/follow-button";
import { ProfileHeader } from "@/features/profiles/components/profile-header";
import { getProfileByUsername, getProfileStats, isFollowing } from "@/features/profiles/queries";
import { USERNAME_PATTERN } from "@/features/profiles/username";

async function loadProfile(rawUsername: string) {
  const username = decodeURIComponent(rawUsername).toLowerCase();
  if (!USERNAME_PATTERN.test(username)) return null;
  return getProfileByUsername(username);
}

export async function generateMetadata(props: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "Profil introuvable", robots: { index: false } };
  const title = `${profile.display_name} (@${profile.username})`;
  const description =
    profile.bio?.slice(0, 160) ??
    `Découvrez les articles de ${profile.display_name} sur ${siteConfig.name}.`;
  const image = avatarUrl(profile.avatar_path);
  return {
    title,
    description,
    alternates: { canonical: publicProfileHref(profile.username) },
    openGraph: { title, description, type: "profile", images: image ? [image] : undefined },
  };
}

export default async function PublicProfilePage(props: PageProps<"/u/[username]">) {
  const { username } = await props.params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const searchParams = await props.searchParams;
  const requestedPage = Number(searchParams.page);
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;

  const viewer = await getCurrentUser();
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
  if (isOwnProfile) {
    actions = (
      <Button asChild variant="outline" size="sm">
        <Link href={routes.editProfile}>Modifier mon profil</Link>
      </Button>
    );
  } else if (viewer) {
    actions = (
      <div className="flex flex-wrap items-center gap-2">
        {blocked ? null : (
          <FollowButton
            profileId={profile.id}
            username={profile.username}
            initialFollowing={following}
          />
        )}
        <ReportDialog targetType="user" targetId={profile.id} signedIn returnTo={profilePath} />
        <BlockButton
          userId={profile.id}
          username={profile.username}
          displayName={profile.display_name}
          initialBlocked={blocked}
        />
      </div>
    );
  } else {
    actions = (
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={signInHref(profilePath)}>Suivre</Link>
        </Button>
        <ReportDialog
          targetType="user"
          targetId={profile.id}
          signedIn={false}
          returnTo={profilePath}
        />
      </div>
    );
  }

  return (
    <div className="container-page flex max-w-4xl flex-col gap-8 pt-6 sm:pt-10">
      <ProfileHeader profile={profile} stats={stats} actions={actions} />
      <section aria-labelledby="profile-listings" className="flex flex-col gap-4">
        <h2 id="profile-listings" className="text-xl font-bold tracking-tight">
          Articles en vente
        </h2>
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
            title="Aucun article en vente pour le moment"
            description={`${profile.display_name} n'a pas encore d'annonce en ligne.`}
          />
        )}
      </section>
    </div>
  );
}
