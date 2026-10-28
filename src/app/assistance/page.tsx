import { ChevronRight, Headset, Inbox, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { routes, supportThreadHref } from "@/config/routes";
import { formatSupportPhone, siteConfig } from "@/config/site";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { listingHref } from "@/features/listings/links";
import { SupportForm } from "@/features/support/components/support-form";
import { getAppealableListing, getMySupportRequests } from "@/features/support/queries";
import type { SupportStatus } from "@/features/support/schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.supportPage.title, robots: { index: false } };
}

const statusVariants: Record<SupportStatus, "warning" | "success" | "neutral"> = {
  open: "warning",
  answered: "success",
  closed: "neutral",
};

export default async function SupportPage(props: PageProps<"/assistance">) {
  const t = await getT();
  const copy = t.supportPage;
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex max-w-3xl flex-col gap-6 pt-4 sm:pt-10">
        <PageHeader title={copy.title} />
        <AuthRequired returnTo={routes.support} />
      </div>
    );
  }
  const { user } = await requireUser(routes.support);
  const raw = (await props.searchParams).contester;
  const contester = typeof raw === "string" ? raw : null;
  const [requests, appealListing] = await Promise.all([
    getMySupportRequests(user.id),
    contester ? getAppealableListing(user.id, contester) : Promise.resolve(null),
  ]);

  const form = (
    <Card>
      <CardHeader>
        <CardTitle>{appealListing ? copy.appealTitle : copy.newTitle}</CardTitle>
        <CardDescription>
          {appealListing ? copy.appealDescription : copy.newDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contester && !appealListing ? <Alert variant="warning">{copy.notAppealable}</Alert> : null}
        {appealListing ? (
          <Alert variant="danger" title={copy.removedListing(appealListing.title)}>
            {appealListing.removed_reason ?? copy.noReason}{" "}
            <Link href={listingHref(appealListing.id)} className="font-semibold underline">
              {copy.viewListing}
            </Link>
          </Alert>
        ) : null}
        <SupportForm
          appeal={
            appealListing ? { listingId: appealListing.id, title: appealListing.title } : undefined
          }
        />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="size-4" aria-hidden="true" />
          {copy.phone}{" "}
          <a
            href={`tel:${siteConfig.supportPhone}`}
            className="font-medium text-foreground hover:underline"
          >
            {formatSupportPhone()}
          </a>
        </p>
      </CardContent>
    </Card>
  );
  const conversations = (
    <section aria-labelledby="my-requests" className="flex flex-col gap-3">
      <h2 id="my-requests" className="text-lg font-bold tracking-tight">
        {copy.conversations}
      </h2>
      {requests.length === 0 ? (
        <EmptyState icon={Inbox} headingLevel="h3" title={copy.none} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {requests.map((request) => {
            const last = request.lastMessage;
            return (
              <li key={request.id}>
                <Link
                  href={supportThreadHref(request.id)}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted"
                >
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Headset className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {request.subject}
                      </span>
                      <time
                        dateTime={request.updatedAt}
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {t.format.relativeTime(request.updatedAt)}
                      </time>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {last ? (last.fromStaff ? copy.lastFromTeam : copy.lastFromYou) : null}
                      {last ? last.body : request.message}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 pt-1">
                      {request.kind === "appeal" ? (
                        <Badge variant="primary">{copy.appeal}</Badge>
                      ) : null}
                      <Badge variant={statusVariants[request.status]}>
                        {copy.statuses[request.status]}
                      </Badge>
                    </span>
                  </span>
                  <ChevronRight
                    className="mt-2.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
      <PageHeader title={copy.title} description={copy.description} />

      {/* Contestation en cours ou première demande : le formulaire d'abord. */}
      {appealListing || contester || requests.length === 0 ? (
        <>
          {form}
          {conversations}
        </>
      ) : (
        <>
          {conversations}
          {form}
        </>
      )}
    </div>
  );
}
