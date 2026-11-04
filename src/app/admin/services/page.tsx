import { Ban, BriefcaseBusiness, RotateCcw, Search, Star } from "lucide-react";
import type { Metadata, Route } from "next";
import Form from "next/form";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { publicProfileHref, routes } from "@/config/routes";
import {
  removeServiceAction,
  restoreServiceAction,
  setServiceFeaturedAction,
} from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { requireStaff } from "@/features/admin/queries";
import {
  ADMIN_SERVICES_PAGE_SIZE,
  type AdminServiceFilter,
  adminServiceFilters,
  getAdminServices,
} from "@/features/services/admin-queries";
import { serviceHref } from "@/features/services/links";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.services };
}

const filterLabels = {
  tous: "all",
  "en-ligne": "active",
  "en-pause": "paused",
  retires: "removed",
  "a-la-une": "featured",
} as const satisfies Record<AdminServiceFilter, string>;

function listHref(filter: AdminServiceFilter, query?: string, page = 1): Route {
  const params = new URLSearchParams();
  if (filter !== "tous") params.set("filtre", filter);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return (search ? `${routes.adminServices}?${search}` : routes.adminServices) as Route;
}

/** Modération des services : retrait, rétablissement et mise à la une. */
export default async function AdminServicesPage(props: PageProps<"/admin/services">) {
  const { role } = await requireStaff(routes.adminServices);
  const [t, searchParams] = await Promise.all([getT(), props.searchParams]);
  const texts = t.adminServices;
  const filter =
    adminServiceFilters.find((value) => value === searchParams.filtre) ?? ("tous" as const);
  const query =
    typeof searchParams.q === "string"
      ? searchParams.q.trim().slice(0, 80) || undefined
      : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { items, total } = await getAdminServices(filter, query, page);

  return (
    <>
      <PageHeader title={t.adminUi.nav.services} description={texts.description} />
      <div className="flex flex-col gap-3">
        <nav aria-label={texts.searchLabel} className="flex flex-wrap gap-2">
          {adminServiceFilters.map((value) => (
            <Link
              key={value}
              href={listHref(value, query)}
              aria-current={value === filter ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                value === filter
                  ? "border-primary bg-primary/10 text-primary-ink"
                  : "border-border hover:bg-muted",
              )}
            >
              {texts.filters[filterLabels[value]]}
            </Link>
          ))}
        </nav>
        <Form action={routes.adminServices} className="flex gap-2" role="search">
          {filter !== "tous" ? <input type="hidden" name="filtre" value={filter} /> : null}
          <label htmlFor="admin-services-q" className="sr-only">
            {texts.searchLabel}
          </label>
          <Input
            id="admin-services-q"
            name="q"
            defaultValue={query}
            placeholder={texts.searchPlaceholder}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" size="icon" aria-label={texts.searchLabel}>
            <Search aria-hidden="true" />
          </Button>
        </Form>
      </div>

      <section aria-labelledby="admin-services-list" className="flex flex-col gap-3">
        <h2 id="admin-services-list" className="text-sm font-semibold text-muted-foreground">
          {texts.count(t.format.count(total))}
        </h2>
        {items.length === 0 ? (
          <EmptyState icon={BriefcaseBusiness} title={texts.empty} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {items.map((service) => (
              <li key={service.id} className="flex flex-col gap-2 p-3 sm:px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={serviceHref(service.id)} className="font-semibold hover:underline">
                    {service.title}
                  </Link>
                  {service.removedAt ? (
                    <Badge variant="danger">{t.services.statuses.removed}</Badge>
                  ) : service.status === "paused" ? (
                    <Badge variant="warning">{t.services.statuses.paused}</Badge>
                  ) : (
                    <Badge variant="success">{t.services.statuses.active}</Badge>
                  )}
                  {service.featuredAt ? (
                    <Badge variant="primary">
                      <Star className="size-3" aria-hidden="true" />
                      {texts.featuredBadge}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {service.category} ·{" "}
                  {service.provider ? (
                    <Link
                      href={publicProfileHref(service.provider.username)}
                      className="hover:underline"
                    >
                      {texts.by(service.provider.displayName)}
                    </Link>
                  ) : null}{" "}
                  · {t.format.date(service.createdAt)}
                </p>
                {service.removedAt && service.removedReason ? (
                  <p className="text-xs text-danger">
                    {texts.removedOn(t.format.date(service.removedAt))} : {service.removedReason}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {service.removedAt ? (
                    <ModerationDialog
                      trigger={
                        <Button variant="outline" size="sm">
                          <RotateCcw aria-hidden="true" />
                          {texts.restore}
                        </Button>
                      }
                      title={texts.restoreTitle}
                      description={texts.restoreDescription}
                      confirmLabel={texts.restore}
                      action={restoreServiceAction}
                      fields={{ serviceId: service.id }}
                      confirmVariant="primary"
                    />
                  ) : (
                    <ModerationDialog
                      trigger={
                        <Button variant="outline" size="sm" className="text-danger">
                          <Ban aria-hidden="true" />
                          {texts.remove}
                        </Button>
                      }
                      title={texts.removeTitle}
                      description={texts.removeDescription}
                      confirmLabel={texts.remove}
                      action={removeServiceAction}
                      fields={{ serviceId: service.id }}
                    />
                  )}
                  {role === "admin" && !service.removedAt ? (
                    <form action={setServiceFeaturedAction}>
                      <input type="hidden" name="serviceId" value={service.id} />
                      <input
                        type="hidden"
                        name="featured"
                        value={service.featuredAt ? "false" : "true"}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        <Star aria-hidden="true" />
                        {service.featuredAt ? texts.unfeature : texts.feature}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          pageCount={Math.max(1, Math.ceil(total / ADMIN_SERVICES_PAGE_SIZE))}
          hrefFor={(target) => listHref(filter, query, target)}
        />
      </section>
    </>
  );
}
