import { CalendarDays, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { getCity } from "@/config/locations";
import { followersHref, followingHref } from "@/config/routes";
import { formatCount, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import { avatarUrl } from "../avatar-url";
import type { ProfileStats, PublicProfile } from "../queries";

type ProfileHeaderProps = {
  profile: PublicProfile;
  stats: ProfileStats;
  actions?: ReactNode;
};

export function ProfileHeader({ profile, stats, actions }: ProfileHeaderProps) {
  const city = profile.city ? (getCity(profile.city)?.name ?? profile.city) : null;
  const items: { label: string; value: number; href?: Route }[] = [
    {
      label: stats.followers > 1 ? "abonnés" : "abonné",
      value: stats.followers,
      href: followersHref(profile.username),
    },
    {
      label: stats.following > 1 ? "abonnements" : "abonnement",
      value: stats.following,
      href: followingHref(profile.username),
    },
    { label: stats.activeListings > 1 ? "annonces" : "annonce", value: stats.activeListings },
  ];

  return (
    <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-x-6 sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-7 sm:shadow-card">
      <Avatar
        name={profile.display_name}
        src={avatarUrl(profile.avatar_path)}
        size="xl"
        className={cn("size-20 text-xl sm:size-24 sm:text-2xl", profile.bio && "sm:row-span-2")}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-col">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            {profile.display_name}
          </h1>
          <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
          {city ? (
            <li className="flex items-center gap-1">
              <MapPin className="size-3.5 sm:size-4" aria-hidden="true" />
              {city}
            </li>
          ) : null}
          <li className="flex items-center gap-1">
            <CalendarDays className="size-3.5 sm:size-4" aria-hidden="true" />
            Membre depuis {formatMonthYear(profile.created_at)}
          </li>
        </ul>
      </div>
      {profile.bio ? (
        <p className="col-span-2 text-sm whitespace-pre-line text-foreground/90 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:-mt-2">
          {profile.bio}
        </p>
      ) : null}
      <dl className="col-span-2 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card py-2.5 text-center sm:col-span-3 sm:border-0 sm:bg-muted/60 sm:py-3">
        {items.map((item) => (
          <div key={item.label} className="relative flex flex-col-reverse px-2">
            <dt className="text-xs text-muted-foreground">
              {item.href ? (
                <Link href={item.href} className="after:absolute after:inset-0 hover:underline">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </dt>
            <dd className="text-lg leading-tight font-bold">{formatCount(item.value)}</dd>
          </div>
        ))}
      </dl>
      {actions ? (
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
