import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { followingHref, publicProfileHref } from "@/config/routes";
import { ProfileList } from "@/features/profiles/components/profile-list";
import { getFollowList, getProfileByUsername } from "@/features/profiles/queries";
import { USERNAME_PATTERN } from "@/features/profiles/username";
import { parsePageParam } from "@/lib/pagination";
import { getT } from "@/i18n/server";

type Props = PageProps<"/u/[username]/abonnements">;

async function load(props: Props) {
  const { username } = await props.params;
  const normalized = decodeURIComponent(username).toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) return null;
  return getProfileByUsername(normalized);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [profile, t] = await Promise.all([load(props), getT()]);
  return {
    title: profile ? t.profilePages.followingOf(profile.display_name) : t.profilePages.notFound,
    robots: { index: false },
  };
}

export default async function Page(props: Props) {
  const profile = await load(props);
  if (!profile) notFound();
  const t = await getT();
  const page = parsePageParam((await props.searchParams).page);
  const list = await getFollowList(profile.id, "following", page);
  const base = followingHref(profile.username);

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={t.profilePages.followingTitle}
        description={
          <Link href={publicProfileHref(profile.username)} className="hover:underline">
            {profile.display_name} (@{profile.username})
          </Link>
        }
      />
      {list.items.length > 0 ? (
        <>
          <ProfileList profiles={list.items} />
          <Pagination
            page={page}
            pageCount={Math.ceil(list.total / list.pageSize)}
            hrefFor={(value) => (value === 1 ? base : (`${base}?page=${value}` as typeof base))}
          />
        </>
      ) : (
        <EmptyState icon={Users} title={t.profilePages.noFollowing} />
      )}
    </div>
  );
}
