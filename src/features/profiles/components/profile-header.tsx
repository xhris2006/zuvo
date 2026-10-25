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
  /** Rangée d'actions (suivre, modifier…), affichée une seule fois sous les statistiques. */
  actions?: ReactNode;
  /** Remplace la photo (ex. photo modifiable sur « Mon profil »). */
  avatar?: ReactNode;
  /** Bouton de retour, en haut à gauche de la bannière. */
  back?: ReactNode;
  /** Menu (paramètres, signalement…), en haut à droite de la bannière. */
  menu?: ReactNode;
};

export async function ProfileHeader({
  profile,
  stats,
  actions,
  avatar,
  back,
  menu,
}: ProfileHeaderProps) {
  const t = await getT();
  const city = await cityName(profile.city);
  const items: { key: string; label: string; value: number; href?: Route }[] = [
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
    {
      key: "listings",
      label: t.profile.listings(stats.activeListings),
      value: stats.activeListings,
    },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="relative h-32 bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900 sm:h-44">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgb(255_255_255/0.28),transparent_42%),radial-gradient(circle_at_88%_85%,rgb(255_255_255/0.18),transparent_38%),radial-gradient(circle_at_60%_-10%,rgb(147_184_250/0.35),transparent_45%)]"
        />
        {back ? <div className="absolute top-3 left-3 sm:top-4 sm:left-4">{back}</div> : null}
        {menu ? (
          <div className="absolute top-3 right-3 flex items-center rounded-full bg-card/95 text-foreground shadow-card backdrop-blur sm:top-4 sm:right-4">
            {menu}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 px-4 pb-5 sm:px-7 sm:pb-7">
        <div className="relative -mt-12 self-start rounded-full bg-card ring-4 ring-card sm:-mt-14">
          {avatar ?? (
            <Avatar
              name={profile.display_name}
              src={avatarUrl(profile.avatar_path)}
              size="xl"
              className="size-24 text-2xl sm:size-28 sm:text-3xl"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-col">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {profile.display_name}
              </h1>
              {profile.verified_at ? <VerifiedBadge /> : null}
            </div>
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
              {t.profile.memberSince(t.format.monthYear(profile.created_at))}
            </li>
          </ul>
          {profile.bio ? (
            <p className="mt-1 max-w-prose text-sm whitespace-pre-line text-foreground/90">
              {profile.bio}
            </p>
          ) : null}
        </div>

        <dl
          aria-label={t.profile.statsLabel}
          className="grid grid-cols-3 divide-x divide-border rounded-2xl bg-muted/60 py-3 text-center sm:max-w-md"
        >
          {items.map((item) => (
            <div key={item.key} className="relative flex flex-col-reverse px-2">
              <dt className="text-xs text-muted-foreground">
                {item.href ? (
                  <Link href={item.href} className="after:absolute after:inset-0 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </dt>
              <dd className="text-lg leading-tight font-bold">{t.format.count(item.value)}</dd>
            </div>
          ))}
        </dl>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
