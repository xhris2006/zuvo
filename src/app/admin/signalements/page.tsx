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
import { getT } from "@/i18n/server";
import { parsePageParam } from "@/lib/pagination";
import { Constants } from "@/lib/supabase/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.reports };
}

const statuses = Constants.public.Enums.report_status;

function statusHref(status: ReportStatus, page = 1): Route {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("statut", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.adminReports}?${query}` : routes.adminReports) as Route;
}

async function Target({ report }: { report: AdminReport }) {
  const t = await getT();
  const target = report.target;
  if (!target) {
    return <p className="text-sm text-muted-foreground">{t.adminPages.reports.targetDeleted}</p>;
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
          {target.removedAt ? (
            <Badge variant="danger">{t.adminPages.listings.removed}</Badge>
          ) : null}
        </div>
        {target.seller ? (
          <p className="text-sm text-muted-foreground">
            {t.adminPages.listings.sellerLabel}{" "}
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
              {t.adminPages.reports.restoreListing}
            </SubmitButton>
          </form>
        ) : (
          <ModerationDialog
            trigger={
              <Button variant="destructive" size="sm" className="self-start">
                <Ban aria-hidden="true" />
                {t.adminPages.reports.removeListing}
              </Button>
            }
            title={t.adminPages.reports.removeTitle}
            description={t.adminPages.reports.removeDescription}
            confirmLabel={t.adminPages.remove}
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
          {suspended ? <Badge variant="danger">{t.adminPages.suspended}</Badge> : null}
        </p>
        {suspended ? null : (
          <ModerationDialog
            trigger={
              <Button variant="destructive" size="sm" className="self-start">
                <UserX aria-hidden="true" />
                {t.adminPages.reports.suspendAccount}
              </Button>
            }
            title={t.adminPages.suspendTitle(target.displayName)}
            description={t.adminPages.reports.suspendDescription}
            confirmLabel={t.adminPages.suspend}
            action={setUserSuspensionAction}
            fields={{ userId: target.id, suspended: "true", reportId: report.id }}
            reasonLabel={t.adminUi.reasonForLog}
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
  const t = await getT();
  const searchParams = await props.searchParams;
  const requested = typeof searchParams.statut === "string" ? searchParams.statut : "pending";
  const status: ReportStatus = (statuses as readonly string[]).includes(requested)
    ? (requested as ReportStatus)
    : "pending";
  const page = parsePageParam(searchParams.page);
  const reports = await getAdminReports(status, page);

  return (
    <>
      <PageHeader title={t.adminUi.nav.reports} />
      <nav aria-label={t.adminPages.reports.statusNav} className="flex flex-wrap gap-2">
        {statuses.map((value) => (
          <Button key={value} asChild size="sm" variant={value === status ? "secondary" : "ghost"}>
            <Link href={statusHref(value)} aria-current={value === status ? "page" : undefined}>
              {t.reports.statuses[value]}
            </Link>
          </Button>
        ))}
      </nav>

      {reports.items.length === 0 ? (
        <EmptyState icon={Flag} title={t.adminPages.reports.empty} />
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
                  · {t.format.relativeTime(report.createdAt)}
                  {report.reporter ? t.adminPages.by(report.reporter.username) : ""}
                </span>
              </div>
              {report.details ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">
                  {report.details}
                </p>
              ) : null}
              <Target report={report} />
              {report.resolutionNote ? (
                <p className="text-sm text-muted-foreground">
                  {t.adminPages.reports.note(report.resolutionNote)}
                </p>
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
