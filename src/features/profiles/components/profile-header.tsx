import { CalendarDays, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { followersHref, followingHref } from "@/config/routes";
import { cityName } from "@/features/locations/queries";
import { getT } from "@/i18n/server";
import { avatarUrl } from "../avatar-url";
import { VerifiedBadge } from "./verified-badge";
import type { ProfileStats, PublicProfile } from "../queries";

type ProfileHeaderProps = {
  profile: PublicProfile;
  stats: ProfileStats;
  /** Rangée d'actions (modifier, partager, suivre…), sous le bloc d'identité. */
  actions?: ReactNode;
  /** Remplace la photo (ex. photo modifiable sur « Mon profil »). */
  avatar?: ReactNode;
  /** Barre du haut, à gauche du pseudo (retour, vente…). */
  leading?: ReactNode;
  /** Barre du haut, à droite du pseudo (notifications, menu…). */
  trailing?: ReactNode;
};

/**
 * En-tête de profil compact : barre du haut (pseudo et actions), photo à
 * gauche, nom et statistiques réelles à droite, informations, présentation
 * et boutons d'action. Sur téléphone, la barre remplace l'en-tête du site
 * (voir data-own-header dans globals.css).
 */
export async function ProfileHeader({
  profile,
  stats,
  actions,
  avatar,
  leading,
  trailing,
}: ProfileHeaderProps) {
  const t = await getT();
  const city = await cityName(profile.city);
  const items: { key: string; label: string; value: number; href?: Route }[] = [
    {
      key: "listings",
      label: t.profile.listings(stats.activeListings),
      value: stats.activeListings,
    },
    {
      key: "followers",
      label: t.profile.followers(stats.followers),
      value: stats.followers,
      href: followersHref(profile.username),
    },
    {
      key: "following",
      label: t.profile.following(stats.following),
      value: stats.following,
      href: followingHref(profile.username),
    },
  ];

  return (
    <section data-own-header className="flex flex-col gap-3.5">
      <div className="sticky top-0 z-30 -mx-4 flex min-h-14 items-center gap-1 border-b border-border/60 bg-background/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-4 lg:static lg:mx-0 lg:h-12 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none dark:bg-chrome/95 lg:dark:bg-transparent">
        <div className="flex w-24 shrink-0 items-center justify-start">{leading}</div>
        <p className="min-w-0 flex-1 truncate text-center text-lg font-bold tracking-tight">
          {profile.username}
        </p>
        <div className="flex w-24 shrink-0 items-center justify-end gap-0.5">{trailing}</div>
      </div>

      <div className="flex items-center gap-4 sm:gap-8">
        <div className="shrink-0">
          {avatar ?? (
            <Avatar
              name={profile.display_name}
              src={avatarUrl(profile.avatar_path)}
              size="xl"
              className="size-[4.5rem] text-xl min-[25rem]:size-20 sm:size-28 sm:text-3xl"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-xl">
              {profile.display_name}
            </h1>
            {profile.verified_at ? <VerifiedBadge /> : null}
          </div>
          <dl aria-label={t.profile.statsLabel} className="grid max-w-sm grid-cols-3 gap-2">
            {items.map((item) => (
              <div key={item.key} className="relative flex min-w-0 flex-col-reverse">
                <dt className="truncate text-[0.6875rem] leading-tight text-muted-foreground min-[25rem]:text-[0.8125rem]">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="after:absolute after:inset-0 after:rounded-md hover:underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </dt>
                <dd className="text-[1.0625rem] leading-tight font-bold">
                  {t.format.count(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8125rem] text-muted-foreground">
          {city ? (
            <li className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {city}
            </li>
          ) : null}
          <li className="flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {t.profile.memberSince(t.format.monthYear(profile.created_at))}
          </li>
        </ul>
        {profile.bio ? (
          <p className="max-w-prose text-sm whitespace-pre-line text-foreground/90">
            {profile.bio}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-2 sm:max-w-md">{actions}</div> : null}
    </section>
  );
}
