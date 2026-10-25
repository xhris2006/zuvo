import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { publicProfileHref } from "@/config/routes";
import { cityNameFrom } from "@/features/locations/names";
import { getCityNames } from "@/features/locations/queries";
import { getDictionary } from "@/i18n";
import { avatarUrl } from "../avatar-url";
import type { ShopSummary } from "../shops";

/** Résultats de recherche de boutiques : photo, nom, pseudo, ville et annonces en vente. */
export async function ShopList({ shops }: { shops: ShopSummary[] }) {
  const t = getDictionary();
  const cityNames = await getCityNames();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shops.map((shop) => {
        const city = cityNameFrom(shop.city, cityNames);
        return (
          <li key={shop.id}>
            <Link
              href={publicProfileHref(shop.username)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card transition-[background-color,transform] hover:bg-accent active:scale-[0.99]"
            >
              <Avatar
                name={shop.displayName}
                src={avatarUrl(shop.avatarPath)}
                size="lg"
                className="size-14"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold">{shop.displayName}</span>
                <span className="truncate text-sm text-muted-foreground">@{shop.username}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
                    {t.explore.shopListings(shop.activeListings)}
                  </span>
                  {city ? (
                    <span className="flex min-w-0 items-center gap-0.5">
                      <MapPin className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{city}</span>
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
