import { Inbox, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { formatSupportPhone, siteConfig } from "@/config/site";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { listingHref } from "@/features/listings/links";
import { SupportForm } from "@/features/support/components/support-form";
import { getAppealableListing, getMySupportRequests } from "@/features/support/queries";
import type { SupportStatus } from "@/features/support/schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Assistance", robots: { index: false } };

const statusBadges: Record<
  SupportStatus,
  { label: string; variant: "warning" | "success" | "neutral" }
> = {
  open: { label: "En attente", variant: "warning" },
  answered: { label: "Répondu", variant: "success" },
  closed: { label: "Clos", variant: "neutral" },
};

export default async function SupportPage(props: PageProps<"/assistance">) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex max-w-3xl flex-col gap-6 pt-4 sm:pt-10">
        <PageHeader title="Assistance" />
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

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
      <PageHeader
        title="Assistance"
        description="Écrivez à l'équipe Zuvo. Vous serez prévenu par notification dès qu'elle aura répondu."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {appealListing ? "Contester le retrait d'une annonce" : "Nouvelle demande"}
          </CardTitle>
          <CardDescription>
            {appealListing
              ? "Expliquez pourquoi l'annonce respecte les règles : l'équipe réexaminera sa décision."
              : "Question sur votre compte, une annonce ou un échange : décrivez la situation."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {contester && !appealListing ? (
            <Alert variant="warning">
              Cette annonce ne peut pas être contestée (elle n&apos;a pas été retirée ou ne vous
              appartient pas). Vous pouvez tout de même écrire à l&apos;équipe ci-dessous.
            </Alert>
          ) : null}
          {appealListing ? (
            <Alert variant="danger" title={`Annonce retirée : « ${appealListing.title} »`}>
              {appealListing.removed_reason ?? "Aucun motif précisé."}{" "}
              <Link href={listingHref(appealListing.id)} className="font-semibold underline">
                Voir l&apos;annonce
              </Link>
            </Alert>
          ) : null}
          <SupportForm
            appeal={
              appealListing
                ? { listingId: appealListing.id, title: appealListing.title }
                : undefined
            }
          />
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="size-4" aria-hidden="true" />
            Assistance téléphonique :{" "}
            <a
              href={`tel:${siteConfig.supportPhone}`}
              className="font-medium text-foreground hover:underline"
            >
              {formatSupportPhone()}
            </a>
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="my-requests" className="flex flex-col gap-3">
        <h2 id="my-requests" className="text-lg font-bold tracking-tight">
          Mes demandes
        </h2>
        {requests.length === 0 ? (
          <EmptyState icon={Inbox} headingLevel="h3" title="Aucune demande pour le moment" />
        ) : (
          <ul className="flex flex-col gap-3">
            {requests.map((request) => {
              const badge = statusBadges[request.status];
              return (
                <li
                  key={request.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 font-semibold break-words">
                      {request.subject}
                    </span>
                    {request.kind === "appeal" ? (
                      <Badge variant="primary">Contestation</Badge>
                    ) : null}
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envoyée le {formatDateTime(request.createdAt)}
                    {request.listing ? (
                      <>
                        {" · "}
                        <Link href={listingHref(request.listing.id)} className="hover:underline">
                          {request.listing.title}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="text-sm whitespace-pre-line text-foreground/90">
                    {request.message}
                  </p>
                  {request.response ? (
                    <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                      <p className="mb-1 text-xs font-semibold text-secondary-foreground">
                        Réponse de l&apos;équipe
                        {request.handledAt ? ` · ${formatDateTime(request.handledAt)}` : ""}
                      </p>
                      <p className="whitespace-pre-line">{request.response}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
