import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/i18n";

/** Conversation en chargement : même disposition plein écran que la page. */
export default function ConversationLoading() {
  const t = getDictionary();
  return (
    <div
      data-immersive
      role="status"
      aria-label={t.common.loading}
      className="container-page flex min-h-dvh max-w-3xl flex-col gap-4 pt-3 md:min-h-[calc(100dvh-4rem)] md:pt-4"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-14 rounded-xl" />
      <div className="flex flex-1 flex-col justify-end gap-3 pb-20">
        <Skeleton className="h-12 w-2/3 self-end rounded-2xl" />
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
        <Skeleton className="h-10 w-1/2 self-end rounded-2xl" />
      </div>
    </div>
  );
}
