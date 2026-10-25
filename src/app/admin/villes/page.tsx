import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import {
  ReferenceCreateForm,
  ReferenceEditForm,
} from "@/features/admin/components/reference-forms";
import { ReferenceRowActions } from "@/features/admin/components/reference-row-actions";
import {
  createCityAction,
  moveCityAction,
  toggleCityAction,
  updateCityAction,
} from "@/features/admin/management-actions";
import { getAdminCities } from "@/features/admin/management-queries";
import { requireAdmin } from "@/features/admin/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.cities };
}

export default async function AdminCitiesPage() {
  await requireAdmin(routes.adminCities);
  const t = await getT();
  const cities = await getAdminCities();

  return (
    <>
      <PageHeader title={t.adminUi.nav.cities} description={t.adminPages.cities.description} />
      {cities.length === 0 ? (
        <Alert variant="info" title={t.adminPages.cities.emptyTitle}>
          {t.adminPages.cities.emptyBody}
        </Alert>
      ) : null}
      <section aria-labelledby="new-city" className="flex flex-col gap-3">
        <h2 id="new-city" className="text-lg font-bold tracking-tight">
          {t.adminPages.cities.newCity}
        </h2>
        <ReferenceCreateForm
          action={createCityAction}
          withRegion
          submitLabel={t.adminPages.cities.addCity}
        />
      </section>

      <section aria-labelledby="city-list" className="flex flex-col gap-3">
        <h2 id="city-list" className="text-lg font-bold tracking-tight">
          {t.adminPages.cities.count(t.format.count(cities.length))}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {cities.map((city, index) => (
            <li key={city.slug} className="flex flex-col gap-2 p-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{city.slug}</span>
                {city.isActive ? null : <Badge variant="neutral">{t.adminPages.deactivated}</Badge>}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <ReferenceEditForm
                  action={updateCityAction}
                  id={city.slug}
                  name={city.name}
                  region={city.region}
                />
                <ReferenceRowActions
                  id={city.slug}
                  name={city.name}
                  isActive={city.isActive}
                  isFirst={index === 0}
                  isLast={index === cities.length - 1}
                  toggleAction={toggleCityAction}
                  moveAction={moveCityAction}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
