import { Inbox, RotateCcw } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { adminUserHref, routes } from "@/config/routes";
import { restoreListingWithReasonAction } from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { SupportAnswerForm } from "@/features/admin/components/support-answer-form";
import {
  getSupportRequests,
  type SupportInboxStatus,
  supportInboxStatuses,
} from "@/features/admin/management-queries";
import { requireStaff } from "@/features/admin/queries";
import { listingHref } from "@/features/listings/links";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Assistance" };

const statusLabels: Record<SupportInboxStatus, string> = {
  open: "En attente",
  answered: "Répondues",
  closed: "Closes",
};

function inboxHref(status: SupportInboxStatus, page = 1): Route {
  const params = new URLSearchParams();
  if (status !== "open") params.set("statut", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.adminSupport}?${query}` : routes.adminSupport) as Route;
}

export default async function AdminSupportPage(props: PageProps<"/admin/assistance">) {
  await requireStaff(routes.adminSupport);
  const searchParams = await props.searchParams;
  const status =
    supportInboxStatuses.find((value) => value === searchParams.statut) ?? ("open" as const);
  const page = parsePageParam(searchParams.page);
  const inbox = await getSupportRequests(status, page);

  return (
    <>
      <PageHeader
        title="Assistance"
        description="Demandes des membres et contestations de retraits d'annonces. Chaque réponse est notifiée à son auteur et inscrite au journal."
      />
      <nav aria-label="Statut des demandes" className="flex flex-wrap gap-2">
        {supportInboxStatuses.map((value) => (
          <Link
            key={value}
            href={inboxHref(value)}
            aria-current={value === status ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium",
              value === status
                ? "bg-foreground text-background"
                : "border border-border bg-card hover:bg-muted",
            )}
          >
            {statusLabels[value]}
          </Link>
        ))}
      </nav>

      {inbox.items.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucune demande" />
      ) : (
        <ul className="flex flex-col gap-3">
          {inbox.items.map((request) => (
            <li
              key={request.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-semibold break-words">{request.subject}</span>
                <Badge variant={request.kind === "appeal" ? "warning" : "primary"}>
                  {request.kind === "appeal" ? "Contestation" : "Contact"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {request.author ? (
                  <Link
                    href={adminUserHref(request.author.id)}
                    className="font-medium hover:underline"
                  >
                    {request.author.displayName} (@{request.author.username})
                  </Link>
                ) : (
                  "Compte supprimé"
                )}{" "}
                · {formatRelativeTime(request.createdAt)}
              </p>
              {request.listing ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    Annonce :{" "}
                    <Link
                      href={listingHref(request.listing.id)}
                      className="font-medium hover:underline"
                    >
                      {request.listing.title}
                    </Link>
                    {request.listing.removedReason ? (
                      <span className="block text-xs text-danger">
                        Motif du retrait : {request.listing.removedReason}
                      </span>
                    ) : null}
                  </span>
                  {request.listing.removedAt ? (
                    <ModerationDialog
                      trigger={
                        <Button variant="outline" size="sm">
                          <RotateCcw aria-hidden="true" />
                          Rétablir l&apos;annonce
                        </Button>
                      }
                      title={`Rétablir « ${request.listing.title} » ?`}
                      description="L'annonce n'est plus bloquée : son vendeur pourra la modifier et la remettre en vente. Répondez ensuite à la contestation."
                      confirmLabel="Rétablir"
                      confirmVariant="primary"
                      action={restoreListingWithReasonAction}
                      fields={{ listingId: request.listing.id }}
                      reasonLabel="Motif (consigné dans le journal)"
                    />
                  ) : (
                    <Badge variant="success">Rétablie</Badge>
                  )}
                </div>
              ) : null}
              <p className="text-sm whitespace-pre-line">{request.message}</p>
              {request.response ? (
                <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold text-secondary-foreground">
                    Réponse envoyée
                    {request.handledAt ? ` · ${formatDateTime(request.handledAt)}` : ""}
                  </p>
                  <p className="whitespace-pre-line">{request.response}</p>
                </div>
              ) : null}
              {request.status === "closed" ? null : <SupportAnswerForm requestId={request.id} />}
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(inbox.total / inbox.pageSize)}
        hrefFor={(value) => inboxHref(status, value) as typeof routes.adminSupport}
      />
    </>
  );
}
