import { BriefcaseBusiness, Eye, MessageCircle, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceGrid } from "@/features/services/components/service-grid";
import { ServiceOwnerActions } from "@/features/services/components/service-owner-actions";
import { getMyServices } from "@/features/services/queries";
import type { OwnServiceData } from "@/features/services/types";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.servicesPages.mineTitle, robots: { index: false } };
}

/** Espace du prestataire : ses services, leur statut, leurs vues et demandes reçues. */
export default async function MyServicesPage(props: PageProps<"/services/mes-services">) {
  const { user } = await requireUser(routes.myServices);
  const [t, searchParams] = await Promise.all([getT(), props.searchParams]);
  const texts = t.servicesPages;
  const services = await getMyServices(user.id);

  const statusBadge = (service: OwnServiceData) =>
    service.removedAt ? (
      <Badge variant="danger">{t.services.statuses.removed}</Badge>
    ) : service.status === "paused" ? (
      <Badge variant="warning">{t.services.statuses.paused}</Badge>
    ) : (
      <Badge variant="success">{t.services.statuses.active}</Badge>
    );

  return (
    <div className="container-page flex flex-col gap-5 pt-4 pb-8 sm:pt-8">
      <PageHeader
        title={texts.mineTitle}
        description={texts.mineIntro}
        actions={
          <Link href={routes.publishService} className={buttonVariants()}>
            <Plus aria-hidden="true" />
            {texts.newService}
          </Link>
        }
      />
      {searchParams.service === "supprime" ? (
        <Alert variant="success" role="status">
          {texts.deletedNotice}
        </Alert>
      ) : null}

      {services.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={texts.mineEmptyTitle}
          description={texts.mineEmptyBody}
          action={
            <Link href={routes.publishService} className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {t.servicesPages.publishService}
            </Link>
          }
        />
      ) : (
        <ServiceGrid>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              footer={
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pt-3 text-xs text-muted-foreground">
                    {statusBadge(service)}
                    <span className="inline-flex items-center gap-1" title={texts.viewsHint}>
                      <Eye className="size-3.5" aria-hidden="true" />
                      {texts.views(service.views)}
                    </span>
                    <span className="inline-flex items-center gap-1" title={texts.requestsHint}>
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {texts.requests(service.requests)}
                    </span>
                  </div>
                  {service.removedReason ? (
                    <p className="px-3 pt-2 text-xs text-danger">
                      {texts.removedReason(service.removedReason)}
                    </p>
                  ) : null}
                  <ServiceOwnerActions
                    serviceId={service.id}
                    status={service.status}
                    removed={Boolean(service.removedAt)}
                  />
                </>
              }
            />
          ))}
        </ServiceGrid>
      )}
      {services.some((service) => service.requests > 0) ? (
        <Link href={routes.messages} className="self-start text-sm font-semibold text-primary-ink">
          {texts.openMessages} →
        </Link>
      ) : null}
    </div>
  );
}
