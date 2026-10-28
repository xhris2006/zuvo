import { Skeleton } from "@/components/ui/skeleton";
import { getT } from "@/i18n/server";

/** Chargement d'une page de l'administration (la barre latérale reste affichée). */
export default async function Loading() {
  const t = await getT();
  return (
    <div role="status" aria-label={t.common.loading} className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
