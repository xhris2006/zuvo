import {
  Download,
  Flag,
  LifeBuoy,
  Package,
  ShieldAlert,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { RankedBars } from "@/features/admin/components/ranked-bars";
import { TrendColumns } from "@/features/admin/components/trend-columns";
import {
  getAdminTrends,
  getOpenSupportCount,
  parseTrendPeriod,
  type TrendPeriod,
  trendPeriods,
} from "@/features/admin/management-queries";
import { getAdminStats, requireStaff } from "@/features/admin/queries";
import { localizedCategoryName } from "@/features/categories/data";
import { cityNameFrom } from "@/features/locations/names";
import { getCityNames } from "@/features/locations/queries";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.dashboard };
}

function periodHref(days: TrendPeriod): Route {
  return (days === 30 ? routes.admin : `${routes.admin}?jours=${days}`) as Route;
}

function exportHref(type: "tendances" | "villes" | "categories", days: TrendPeriod): Route {
  return `/admin/export?type=${type}&jours=${days}` as Route;
}

export default async function AdminDashboardPage(props: PageProps<"/admin">) {
  await requireStaff(routes.admin);
  const t = await getT();
  const days = parseTrendPeriod((await props.searchParams).jours);
  const [stats, trends, cityNames, openSupport] = await Promise.all([
    getAdminStats(),
    getAdminTrends(days),
    getCityNames(),
    getOpenSupportCount(),
  ]);
  const tiles: Array<{
    label: string;
    value: number;
    icon: typeof Flag;
    href?: Route;
    highlight?: boolean;
  }> = [
    {
      label: t.adminPages.dashboard.pendingReports,
      value: stats.pending_reports,
      icon: Flag,
      href: routes.adminReports,
      highlight: stats.pending_reports > 0,
    },
    {
      label: t.adminPages.dashboard.inReviewReports,
      value: stats.in_review_reports,
      icon: ShieldAlert,
      href: `${routes.adminReports}?statut=in_review` as Route,
    },
    {
      label: t.adminPages.dashboard.supportRequests,
      value: openSupport,
      icon: LifeBuoy,
      href: routes.adminSupport,
      highlight: openSupport > 0,
    },
    {
      label: t.adminPages.dashboard.users,
      value: stats.users,
      icon: Users,
      href: routes.adminUsers,
    },
    { label: t.adminPages.dashboard.newUsers, value: stats.new_users_7d, icon: UserPlus },
    { label: t.adminPages.dashboard.suspendedUsers, value: stats.suspended_users, icon: UserX },
    { label: t.adminPages.dashboard.activeListings, value: stats.active_listings, icon: Package },
    { label: t.adminPages.dashboard.newListings, value: stats.new_listings_7d, icon: Package },
    {
      label: t.adminPages.dashboard.removedListings,
      value: stats.removed_listings,
      icon: Package,
      href: `${routes.adminListings}?moderation=retirees` as Route,
    },
  ];

  const series = (["users", "listings", "reports"] as const).map((key) => ({
    key,
    ...t.adminPages.dashboard.series[key],
  }));

  return (
    <>
      <PageHeader
        title={t.adminUi.nav.dashboard}
        description={t.adminPages.dashboard.description}
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const content = (
            <>
              <tile.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-2xl font-bold tracking-tight">
                {t.format.count(tile.value)}
              </span>
              <span className="text-sm text-muted-foreground">{tile.label}</span>
            </>
          );
          const className = `flex h-full flex-col gap-1.5 rounded-2xl border bg-card p-4 shadow-card ${
            tile.highlight ? "border-danger/40" : "border-border"
          }`;
          return (
            <li key={tile.label}>
              {tile.href ? (
                <Link href={tile.href} className={`${className} transition-colors hover:bg-accent`}>
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="trends-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="trends-title" className="text-lg font-bold tracking-tight sm:text-xl">
            {t.adminPages.dashboard.trends}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <nav
              aria-label={t.adminPages.dashboard.period}
              className="inline-flex rounded-full bg-muted p-1"
            >
              {trendPeriods.map((period) => (
                <Link
                  key={period}
                  href={periodHref(period)}
                  aria-current={period === days ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    period === days
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.adminPages.dashboard.periodDays(period)}
                </Link>
              ))}
            </nav>
            <a
              href={exportHref("tendances", days)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t.adminPages.dashboard.exportCsv}
            </a>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {series.map((item) => {
            const points = trends.days.map((day) => ({
              label: t.format.dayMonth(day.day),
              value: day[item.key],
            }));
            const total = points.reduce((sum, point) => sum + point.value, 0);
            return (
              <TrendColumns
                key={item.key}
                title={item.title}
                summary={t.adminPages.dashboard.summary(t.format.count(total), days)}
                points={points}
                unit={item.unit}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="breakdown-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="breakdown-title" className="text-lg font-bold tracking-tight sm:text-xl">
            {t.adminPages.dashboard.breakdown}
          </h2>
          <div className="flex gap-2">
            <a
              href={exportHref("villes", days)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t.adminPages.dashboard.citiesCsv}
            </a>
            <a
              href={exportHref("categories", days)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t.adminPages.dashboard.categoriesCsv}
            </a>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <RankedBars
            title={t.adminPages.dashboard.byCity}
            description={t.adminPages.dashboard.byCityDescription}
            rows={trends.cities.map((city) => ({
              key: city.city,
              label: cityNameFrom(city.city, cityNames) ?? city.city,
              value: city.active_listings,
            }))}
            restLabel={t.adminPages.dashboard.otherCities}
            emptyText={t.adminPages.dashboard.noActiveListings}
          />
          <RankedBars
            title={t.adminPages.dashboard.byCategory}
            description={t.adminPages.dashboard.byCategoryDescription}
            rows={trends.categories.map((category) => ({
              key: category.slug,
              label: localizedCategoryName(t.categoryNames, category),
              value: category.active_listings,
            }))}
            restLabel={t.adminPages.dashboard.otherCategories}
            emptyText={t.adminPages.dashboard.noActiveListings}
          />
        </div>
      </section>
    </>
  );
}
