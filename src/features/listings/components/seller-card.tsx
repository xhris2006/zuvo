import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { publicProfileHref } from "@/config/routes";
import { cityName } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { VerifiedBadge } from "@/features/profiles/components/verified-badge";
import { getT } from "@/i18n/server";

type SellerCardProps = {
  seller: {
    username: string;
    display_name: string;
    avatar_path: string | null;
    city: string | null;
    created_at: string;
    /** Badge « vendeur vérifié ». */
    verified_at?: string | null;
  };
  /** Version réduite (sous le prix, sur mobile). */
  compact?: boolean;
};

export async function SellerCard({ seller, compact = false }: SellerCardProps) {
  const t = await getT();
  const city = await cityName(seller.city);
  if (compact) {
    return (
      <Link
        href={publicProfileHref(seller.username)}
        className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted"
      >
        <Avatar name={seller.display_name} src={avatarUrl(seller.avatar_path)} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-semibold">{seller.display_name}</span>
            {seller.verified_at ? <VerifiedBadge variant="icon" /> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            @{seller.username}
            {city ? ` · ${city}` : ""}
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <Link
      href={publicProfileHref(seller.username)}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-accent"
    >
      <Avatar name={seller.display_name} src={avatarUrl(seller.avatar_path)} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold">{seller.display_name}</span>
          {seller.verified_at ? <VerifiedBadge variant="icon" /> : null}
        </span>
        <span className="truncate text-sm text-muted-foreground">@{seller.username}</span>
        <span className="text-xs text-muted-foreground">
          {city ? `${city} · ` : ""}
          {t.profile.memberSince(t.format.monthYear(seller.created_at))}
        </span>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
