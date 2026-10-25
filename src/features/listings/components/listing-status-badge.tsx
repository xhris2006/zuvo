import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";
import type { ListingStatus } from "../constants";

const variants = {
  draft: "outline",
  active: "primary",
  reserved: "warning",
  sold: "solid",
  withdrawn: "neutral",
} as const satisfies Record<ListingStatus, string>;

export async function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  const t = await getT();
  return (
    <Badge variant={variants[status]} className={className}>
      {t.listing.statuses[status]}
    </Badge>
  );
}
