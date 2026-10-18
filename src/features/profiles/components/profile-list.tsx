import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { getCity } from "@/config/locations";
import { publicProfileHref } from "@/config/routes";
import { avatarUrl } from "../avatar-url";
import type { ProfileSummary } from "../queries";

export function ProfileList({ profiles }: { profiles: ProfileSummary[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {profiles.map((profile) => (
        <li key={profile.id}>
          <Link
            href={publicProfileHref(profile.username)}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
          >
            <Avatar name={profile.display_name} src={avatarUrl(profile.avatar_path)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{profile.display_name}</span>
              <span className="truncate text-sm text-muted-foreground">
                @{profile.username}
                {profile.city ? ` · ${getCity(profile.city)?.name ?? profile.city}` : ""}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
