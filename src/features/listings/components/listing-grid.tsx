import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const gridClasses = "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 sm:gap-x-5";

export function ListingGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(gridClasses, className)}>{children}</div>;
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="aspect-[4/5] rounded-xl" />
      <div className="flex flex-col gap-1.5 px-0.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 8, label }: { count?: number; label: string }) {
  return (
    <div role="status" aria-label={label}>
      <div className={gridClasses}>
        {Array.from({ length: count }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
