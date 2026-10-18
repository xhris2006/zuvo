import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { getCity } from "@/config/locations";
import { publicProfileHref } from "@/config/routes";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { formatMonthYear } from "@/lib/format";

type SellerCardProps = {
  seller: {
    username: string;
    display_name: string;
    avatar_path: string | null;
    city: string | null;
    created_at: string;
  };
};

export function SellerCard({ seller }: SellerCardProps) {
  const city = seller.city ? (getCity(seller.city)?.name ?? null) : null;
  return (
    <Link
      href={publicProfileHref(seller.username)}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-accent"
    >
      <Avatar name={seller.display_name} src={avatarUrl(seller.avatar_path)} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{seller.display_name}</span>
        <span className="truncate text-sm text-muted-foreground">@{seller.username}</span>
        <span className="text-xs text-muted-foreground">
          {city ? `${city} · ` : ""}Membre depuis {formatMonthYear(seller.created_at)}
        </span>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
