import { Skeleton } from "@/components/ui/skeleton";
import { ListingGridSkeleton } from "@/features/listings/components/listing-grid";
import { getT } from "@/i18n/server";

/** Squelette générique : titre puis blocs de contenu. */
export async function PageSkeleton() {
  const t = await getT();
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
export async function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const t = await getT();
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

/** En-tête de profil compact (photo, statistiques, boutons, onglets) puis grille d'annonces. */
export async function ProfileSkeleton() {
  const t = await getT();
  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className="container-page flex max-w-4xl flex-col gap-5 pt-4 sm:gap-7 sm:pt-8"
    >
      <Skeleton className="mx-auto h-5 w-32" />
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 shrink-0 rounded-full sm:size-28" />
        <div className="grid flex-1 grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 sm:max-w-md">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
      <Skeleton className="h-11 rounded-none" />
      <ListingGridSkeleton count={4} label={t.common.loading} />
    </div>
  );
}

/** Fiche d'une annonce : grande photo, prix, titre et vendeur. */
export async function ListingPageSkeleton() {
  const t = await getT();
  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className="container-page grid max-w-6xl gap-5 pt-3 sm:pt-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10"
    >
      <Skeleton className="-mx-4 aspect-square rounded-none sm:mx-0 sm:rounded-2xl lg:aspect-[4/3]" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-2 h-12 rounded-xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}

/** Grille d'annonces sous un titre (favoris, fil). */
export async function GridPageSkeleton() {
  const t = await getT();
  return (
    <div className="container-page flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <Skeleton className="h-8 w-40" />
      <ListingGridSkeleton label={t.common.loading} />
    </div>
  );
}
