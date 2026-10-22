import { Skeleton } from "@/components/ui/skeleton";
import { ListingGridSkeleton } from "@/features/listings/components/listing-grid";
import { getDictionary } from "@/i18n";

/** Squelette générique : titre puis blocs de contenu. */
export function PageSkeleton() {
  const t = getDictionary();
  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className="container-page flex max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

/** Liste de lignes (messages, notifications). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const t = getDictionary();
  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className="container-page flex max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10"
    >
      <Skeleton className="h-8 w-40" />
      <div className="-mx-4 flex flex-col divide-y divide-border border-y border-border bg-card sm:mx-0 sm:rounded-2xl sm:border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** En-tête de profil puis grille d'annonces. */
export function ProfileSkeleton() {
  const t = getDictionary();
  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className="container-page flex max-w-4xl flex-col gap-8 pt-5 sm:pt-10"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <ListingGridSkeleton count={4} label={t.common.loading} />
    </div>
  );
}

/** Grille d'annonces sous un titre (favoris, fil). */
export function GridPageSkeleton() {
  const t = getDictionary();
  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <Skeleton className="h-8 w-40" />
      <ListingGridSkeleton label={t.common.loading} />
    </div>
  );
}
