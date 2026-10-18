import { CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { getCity } from "@/config/locations";
import { formatCount, formatMonthYear } from "@/lib/format";
import { avatarUrl } from "../avatar-url";
import type { ProfileStats, PublicProfile } from "../queries";

type ProfileHeaderProps = {
  profile: PublicProfile;
  stats: ProfileStats;
  actions?: ReactNode;
};

export function ProfileHeader({ profile, stats, actions }: ProfileHeaderProps) {
  const city = profile.city ? (getCity(profile.city)?.name ?? profile.city) : null;
  const items = [
    { label: stats.followers > 1 ? "abonnés" : "abonné", value: stats.followers },
    { label: stats.following > 1 ? "abonnements" : "abonnement", value: stats.following },
    { label: stats.activeListings > 1 ? "annonces" : "annonce", value: stats.activeListings },
  ];

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar
          name={profile.display_name}
          src={avatarUrl(profile.avatar_path)}
          size="xl"
          className="self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h1 className="truncate text-2xl font-bold tracking-tight">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {city ? (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {city}
              </li>
            ) : null}
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              Membre depuis {formatMonthYear(profile.created_at)}
            </li>
          </ul>
          {profile.bio ? (
            <p className="text-sm whitespace-pre-line text-foreground/90">{profile.bio}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <dl className="grid grid-cols-3 divide-x divide-border rounded-xl bg-muted/60 py-3 text-center">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col-reverse px-2">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-lg font-bold">{formatCount(item.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
