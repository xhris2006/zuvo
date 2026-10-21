import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const gridClasses =
  "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4";

export function ListingGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(gridClasses, className)}>{children}</div>;
}

/** Rangée défilante sur mobile (aperçu d'une liste), une ligne de grille sur grand écran. */
export function ListingCarousel({ children }: { children: ReactNode[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-x-5 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
      {children.map((child, index) => (
        <li key={index} className="w-[42%] shrink-0 snap-start sm:w-auto sm:nth-[n+5]:hidden">
          {child}
        </li>
      ))}
    </ul>
  );
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
