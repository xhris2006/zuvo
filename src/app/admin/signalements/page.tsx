import { Ban, ExternalLink, Flag, RotateCcw, UserX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { adminUserHref, publicProfileHref, routes } from "@/config/routes";
import {
  removeListingAction,
  restoreListingAction,
  setUserSuspensionAction,
} from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { ReportStatusForm } from "@/features/admin/components/report-status-form";
import { ReportedMessage } from "@/features/admin/components/reported-message";
import { SuspensionFields } from "@/features/admin/components/suspension-fields";
import { type AdminReport, getAdminReports, requireStaff } from "@/features/admin/queries";
import { isSuspensionActive } from "@/features/admin/suspension";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import { listingHref } from "@/features/listings/links";
import type { ReportStatus } from "@/features/moderation/schemas";
import { getDictionary } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import { Constants } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Signalements" };

const statuses = Constants.public.Enums.report_status;

function statusHref(status: ReportStatus, page = 1): Route {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("statut", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.adminReports}?${query}` : routes.adminReports) as Route;
}

function Target({ report }: { report: AdminReport }) {
  const target = report.target;
  if (!target) {
    return <p className="text-sm text-muted-foreground">Élément supprimé depuis le signalement.</p>;
  }
  if (target.kind === "listing") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={listingHref(target.id)}
            className="inline-flex items-center gap-1 font-medium hover:underline"
          >
            {target.title}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <ListingStatusBadge status={target.status} />
          {target.removedAt ? <Badge variant="danger">Retirée</Badge> : null}
        </div>
        {target.seller ? (
          <p className="text-sm text-muted-foreground">
            Vendeur :{" "}
            <Link href={publicProfileHref(target.seller.username)} className="hover:underline">
              {target.seller.displayName} (@{target.seller.username})
            </Link>
          </p>
        ) : null}
        {target.removedAt ? (
          <form action={restoreListingAction}>
            <input type="hidden" name="listingId" value={target.id} />
            <SubmitButton variant="outline" size="sm">
              <RotateCcw aria-hidden="true" />
              Restaurer l&apos;annonce
            </SubmitButton>
          </form>
        ) : (
          <ModerationDialog
            trigger={
              <Button variant="destructive" size="sm" className="self-start">
                <Ban aria-hidden="true" />
                Retirer l&apos;annonce
              </Button>
            }
            title="Retirer cette annonce ?"
            description="Elle sera masquée immédiatement et le vendeur sera prévenu avec le motif indiqué. Le signalement sera marqué comme traité."
            confirmLabel="Retirer"
            action={removeListingAction}
            fields={{ listingId: target.id, reportId: report.id }}
          />
        )}
      </div>
    );
  }
  if (target.kind === "user") {
    const suspended = isSuspensionActive(target.suspendedAt, target.suspendedUntil);
    return (
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2">
          <Link href={adminUserHref(target.id)} className="font-medium hover:underline">
            {target.displayName} (@{target.username})
          </Link>
          {suspended ? <Badge variant="danger">Suspendu</Badge> : null}
        </p>
        {suspended ? null : (
          <ModerationDialog
            trigger={
              <Button variant="destructive" size="sm" className="self-start">
                <UserX aria-hidden="true" />
                Suspendre le compte
              </Button>
            }
            title={`Suspendre ${target.displayName} ?`}
            description="Son profil et ses annonces seront masqués ; il ne pourra plus publier ni envoyer de messages. Le signalement sera marqué comme traité."
            confirmLabel="Suspendre"
            action={setUserSuspensionAction}
            fields={{ userId: target.id, suspended: "true", reportId: report.id }}
            reasonLabel="Motif (consigné dans le journal)"
          >
            <SuspensionFields />
          </ModerationDialog>
        )}
      </div>
    );
  }
  return <ReportedMessage reportId={report.id} />;
}

export default async function AdminReportsPage(props: PageProps<"/admin/signalements">) {
  await requireStaff(routes.adminReports);
  const t = getDictionary();
  const searchParams = await props.searchParams;
  const requested = typeof searchParams.statut === "string" ? searchParams.statut : "pending";
  const status: ReportStatus = (statuses as readonly string[]).includes(requested)
    ? (requested as ReportStatus)
    : "pending";
  const page = parsePageParam(searchParams.page);
  const reports = await getAdminReports(status, page);

  return (
    <>
      <PageHeader title="Signalements" />
      <nav aria-label="Statut des signalements" className="flex flex-wrap gap-2">
        {statuses.map((value) => (
          <Button key={value} asChild size="sm" variant={value === status ? "secondary" : "ghost"}>
            <Link href={statusHref(value)} aria-current={value === status ? "page" : undefined}>
              {t.reports.statuses[value]}
            </Link>
          </Button>
        ))}
      </nav>

      {reports.items.length === 0 ? (
        <EmptyState icon={Flag} title="Aucun signalement dans cette catégorie" />
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.items.map((report) => (
            <li
              key={report.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{t.reports.targets[report.targetType]}</Badge>
                <span className="font-semibold">{t.reports.reasons[report.reason]}</span>
                <span className="text-muted-foreground">
                  · {formatRelativeTime(report.createdAt)}
                  {report.reporter ? ` · par @${report.reporter.username}` : ""}
                </span>
              </div>
              {report.details ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">
                  {report.details}
                </p>
              ) : null}
              <Target report={report} />
              {report.resolutionNote ? (
                <p className="text-sm text-muted-foreground">Note : {report.resolutionNote}</p>
              ) : null}
              <ReportStatusForm reportId={report.id} status={report.status} />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(reports.total / reports.pageSize)}
        hrefFor={(value) => statusHref(status, value) as typeof routes.adminReports}
      />
    </>
  );
}
