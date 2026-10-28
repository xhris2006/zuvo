import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes, supportThreadHref } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { listingHref } from "@/features/listings/links";
import { SupportComposer } from "@/features/support/components/support-composer";
import { SupportLive } from "@/features/support/components/support-live";
import { SupportThreadMessages } from "@/features/support/components/support-thread";
import { getSupportThread, markSupportNotificationsRead } from "@/features/support/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.supportPage.title, robots: { index: false } };
}

const statusVariants = { open: "warning", answered: "success", closed: "neutral" } as const;

/** Conversation d'une demande d'assistance, côté membre. */
export default async function SupportThreadPage(props: PageProps<"/assistance/[id]">) {
  const { id } = await props.params;
  const { user } = await requireUser(supportThreadHref(id));
  const [t, thread] = await Promise.all([getT(), getSupportThread(id)]);
  // L'équipe ouvre les demandes depuis l'administration ; ici, uniquement les siennes.
  if (!thread || thread.userId !== user.id) notFound();
  await markSupportNotificationsRead(user.id, thread.id);
  const copy = t.supportPage;

  return (
    <div className="container-page flex max-w-3xl flex-col gap-4 pt-3 sm:gap-6 sm:pt-8">
      <div className="flex flex-col gap-1.5">
        <Link
          href={routes.support}
          className="-ml-1.5 inline-flex items-center gap-0.5 self-start rounded-md py-1 pr-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4.5" aria-hidden="true" />
          {copy.allRequests}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight break-words sm:text-[1.625rem]">
          {thread.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {thread.kind === "appeal" ? <Badge variant="primary">{copy.appeal}</Badge> : null}
          <Badge variant={statusVariants[thread.status]}>{copy.statuses[thread.status]}</Badge>
          <span>{copy.openedOn(t.format.dateTime(thread.createdAt))}</span>
          {thread.listing ? (
            <Link href={listingHref(thread.listing.id)} className="hover:underline">
              {thread.listing.title}
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{copy.threadIntro}</p>
      </div>

      <SupportThreadMessages messages={thread.messages} viewer="member" />

      <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-border bg-background/95 px-4 pt-3 pb-3 backdrop-blur sm:mx-0 sm:px-0 md:bottom-0 dark:bg-chrome/95">
        {thread.status === "closed" ? (
          <Alert variant="info">
            {copy.closedNotice}{" "}
            <Button asChild variant="link" className="h-auto p-0">
              <Link href={routes.support}>{copy.newTitle}</Link>
            </Button>
          </Alert>
        ) : (
          <SupportComposer requestId={thread.id} />
        )}
      </div>
      <SupportLive requestId={thread.id} />
    </div>
  );
}
