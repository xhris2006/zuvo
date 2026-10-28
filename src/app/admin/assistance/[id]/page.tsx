import { ChevronLeft, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminSupportThreadHref, adminUserHref, routes } from "@/config/routes";
import { restoreListingWithReasonAction } from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { SupportAnswerForm } from "@/features/admin/components/support-answer-form";
import { requireStaff } from "@/features/admin/queries";
import { listingHref } from "@/features/listings/links";
import { SupportLive } from "@/features/support/components/support-live";
import { SupportThreadMessages } from "@/features/support/components/support-thread";
import { getSupportThread, markSupportNotificationsRead } from "@/features/support/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.support };
}

const statusVariants = { open: "warning", answered: "success", closed: "neutral" } as const;

/** Conversation d'une demande d'assistance, côté équipe. */
export default async function AdminSupportThreadPage(props: PageProps<"/admin/assistance/[id]">) {
  const { id } = await props.params;
  const { user } = await requireStaff(adminSupportThreadHref(id));
  const [t, thread] = await Promise.all([getT(), getSupportThread(id)]);
  if (!thread) notFound();
  await markSupportNotificationsRead(user.id, thread.id);
  const copy = t.adminPages.support;

  return (
    <div className="flex max-w-3xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-1.5">
        <Link
          href={routes.adminSupport}
          className="-ml-1.5 inline-flex items-center gap-0.5 self-start rounded-md py-1 pr-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4.5" aria-hidden="true" />
          {copy.backToInbox}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight break-words sm:text-[1.625rem]">
          {thread.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={thread.kind === "appeal" ? "warning" : "primary"}>
            {thread.kind === "appeal" ? copy.appeal : copy.contact}
          </Badge>
          <Badge variant={statusVariants[thread.status]}>{copy.statuses[thread.status]}</Badge>
          {thread.author ? (
            <Link href={adminUserHref(thread.author.id)} className="font-medium hover:underline">
              {thread.author.displayName} (@{thread.author.username})
            </Link>
          ) : (
            <span>{t.adminPages.deletedAccount}</span>
          )}
          <span>· {t.format.relativeTime(thread.createdAt)}</span>
        </div>
      </div>

      {thread.listing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">
            {copy.listingLabel}{" "}
            <Link href={listingHref(thread.listing.id)} className="font-medium hover:underline">
              {thread.listing.title}
            </Link>
            {thread.listing.removedReason ? (
              <span className="block text-xs text-danger">
                {t.adminPages.removalReason(thread.listing.removedReason)}
              </span>
            ) : null}
          </span>
          {thread.listing.removedAt ? (
            <ModerationDialog
              trigger={
                <Button variant="outline" size="sm">
                  <RotateCcw aria-hidden="true" />
                  {copy.restoreListing}
                </Button>
              }
              title={t.adminPages.restoreTitle(thread.listing.title)}
              description={copy.restoreDescription}
              confirmLabel={t.adminPages.restore}
              confirmVariant="primary"
              action={restoreListingWithReasonAction}
              fields={{ listingId: thread.listing.id }}
              reasonLabel={t.adminUi.reasonForLog}
            />
          ) : (
            <Badge variant="success">{copy.restored}</Badge>
          )}
        </div>
      ) : null}

      <SupportThreadMessages
        messages={thread.messages}
        viewer="staff"
        memberName={thread.author?.displayName}
      />

      <div className="rounded-2xl border border-border bg-card p-4">
        {thread.status === "closed" ? (
          <Alert variant="info">{copy.closedNotice}</Alert>
        ) : (
          <SupportAnswerForm requestId={thread.id} />
        )}
      </div>
      <SupportLive requestId={thread.id} />
    </div>
  );
}
