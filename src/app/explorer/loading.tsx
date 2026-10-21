import { Skeleton } from "@/components/ui/skeleton";
import { ListingGridSkeleton } from "@/features/listings/components/listing-grid";
import { getDictionary } from "@/i18n";

export default function ExploreLoading() {
  const t = getDictionary();
  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <Skeleton className="hidden h-[34rem] rounded-xl lg:block" />
        <ListingGridSkeleton label={t.common.loading} />
      </div>
    </div>
  );
}
