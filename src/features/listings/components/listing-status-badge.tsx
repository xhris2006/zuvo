import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/i18n";
import type { ListingStatus } from "../constants";

const variants = {
  draft: "outline",
  active: "primary",
  reserved: "warning",
  sold: "solid",
  withdrawn: "neutral",
} as const satisfies Record<ListingStatus, string>;

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  const t = getDictionary();
  return (
    <Badge variant={variants[status]} className={className}>
      {t.listing.statuses[status]}
    </Badge>
  );
}
