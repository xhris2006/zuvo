import { ScrollText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { adminUserHref, routes } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Constants } from "@/lib/supabase/database.types";
import { getConfigActivity } from "@/features/admin/management-queries";
import {
  getModerationLog,
  type ModerationLogFilters,
  parseModerationLogFilters,
  requireStaff,
} from "@/features/admin/queries";
import { listingHref } from "@/features/listings/links";
import { getT } from "@/i18n/server";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import { parsePageParam } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminPages.log.title };
}

function JournalTabs({
  current,
  showConfig,
  t,
}: {
  current: "moderation" | "configuration";
  showConfig: boolean;
  t: ServerDictionary;
}) {
  if (!showConfig) return null;
  const tabs = [
    { key: "moderation", label: t.adminUi.nav.moderation, href: routes.adminLog },
    {
      key: "configuration",
      label: t.adminUi.nav.config,
      href: `${routes.adminLog}?vue=configuration` as Route,
    },
  ] as const;
  return (
    <nav aria-label={t.adminPages.log.tabsLabel} className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium",
            tab.key === current
              ? "bg-foreground text-background"
              : "border border-border bg-card hover:bg-muted",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * « Animaux (is_active, name) » → « Animaux (activation, nom) » ; nom lisible
 * pour un réglage.
 */
function readableSummary(
  summary: string,
  fields: Record<string, string>,
  settings: Record<string, string>,
) {
  const key = summary.split(" (")[0] ?? "";
  const labelled = settings[key] ? summary.replace(key, settings[key]) : summary;
  return labelled.replace(
    /\(([a-z_, ]+)\)$/,
    (_match, keys: string) =>
      `(${keys
        .split(", ")
        .map((field) => fields[field] ?? field)
        .join(", ")})`,
  );
}

/** Journal des catégories, villes et messages globaux (administrateurs). */
async function ConfigurationLog({ page }: { page: number }) {
  const t = await getT();
  const log = await getConfigActivity(page);
  return (
    <>
      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title={t.adminPages.log.noChanges} />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card text-sm shadow-card">
          {log.items.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="font-medium">
                {t.admin.entities[entry.entity] ?? entry.entity} ·{" "}
                {t.admin.changes[entry.action] ?? entry.action}
              </span>
              {entry.summary ? (
                <span className="break-words text-muted-foreground">
                  {readableSummary(entry.summary, t.admin.fields, t.admin.settings)}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {t.format.dateTime(entry.createdAt)}
                {entry.adminUsername ? t.adminPages.by(entry.adminUsername) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(log.total / log.pageSize)}
        hrefFor={(value) =>
          `${routes.adminLog}?vue=configuration${value > 1 ? `&page=${value}` : ""}` as typeof routes.adminLog
        }
      />
    </>
  );
}

function logHref(filters: ModerationLogFilters, page = 1): Route {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.targetType) params.set("cible", filters.targetType);
  if (filters.admin) params.set("membre", filters.admin);
  if (filters.from) params.set("du", filters.from);
  if (filters.to) params.set("au", filters.to);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.adminLog}?${query}` : routes.adminLog) as Route;
}

/** Filtres du journal (formulaire GET, sans JavaScript). */
async function LogFilters({ filters }: { filters: ModerationLogFilters }) {
  const t = await getT();
  const active = logHref(filters) !== routes.adminLog;
  return (
    <form
      action={routes.adminLog}
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-action" className="text-sm font-medium">
          {t.adminPages.log.action}
        </label>
        <Select id="log-action" name="action" defaultValue={filters.action ?? ""}>
          <option value="">{t.adminPages.log.all}</option>
          {Constants.public.Enums.moderation_action_type.map((action) => (
            <option key={action} value={action}>
              {t.admin.actions[action]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-target" className="text-sm font-medium">
          {t.adminPages.log.target}
        </label>
        <Select id="log-target" name="cible" defaultValue={filters.targetType ?? ""}>
          <option value="">{t.adminPages.log.all}</option>
          {Constants.public.Enums.report_target_type.map((target) => (
            <option key={target} value={target}>
              {t.reports.targets[target]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-member" className="text-sm font-medium">
          {t.adminPages.log.member}
        </label>
        <Input
          id="log-member"
          name="membre"
          defaultValue={filters.admin ?? ""}
          placeholder={t.adminPages.listings.usernamePlaceholder}
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="log-from" className="text-sm font-medium">
            {t.adminPages.log.from}
          </label>
          <Input id="log-from" name="du" type="date" defaultValue={filters.from ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="log-to" className="text-sm font-medium">
            {t.adminPages.log.to}
          </label>
          <Input id="log-to" name="au" type="date" defaultValue={filters.to ?? ""} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">
          {t.adminPages.filter}
        </Button>
        {active ? (
          <Button asChild variant="ghost">
            <Link href={routes.adminLog}>{t.adminPages.log.clear}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default async function AdminLogPage(props: PageProps<"/admin/journal">) {
  const { role } = await requireStaff(routes.adminLog);
  const t = await getT();
  const searchParams = await props.searchParams;
  const page = parsePageParam(searchParams.page);
  const showConfig = role === "admin";
  if (showConfig && searchParams.vue === "configuration") {
    return (
      <>
        <PageHeader
          title={t.adminPages.log.configTitle}
          description={t.adminPages.log.configDescription}
        />
        <JournalTabs current="configuration" showConfig t={t} />
        <ConfigurationLog page={page} />
      </>
    );
  }
  const filters = parseModerationLogFilters(searchParams);
  const log = await getModerationLog(page, filters);

  return (
    <>
      <PageHeader title={t.adminPages.log.title} description={t.adminPages.log.description} />
      <JournalTabs current="moderation" showConfig={showConfig} t={t} />
      <LogFilters filters={filters} />
      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        {t.adminPages.log.count(log.total)}
      </p>
      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title={t.adminPages.log.noMatch} />
      ) : (
        // Zone défilante atteignable au clavier (tableau large sur mobile).
        <div
          role="region"
          aria-label={t.adminPages.log.regionLabel}
          tabIndex={0}
          className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t.adminPages.log.date}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t.adminPages.log.action}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t.adminPages.log.target}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t.adminPages.log.by}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t.adminPages.log.note}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {log.items.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {t.format.dateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3">{t.admin.actions[entry.action]}</td>
                  <td className="px-4 py-3">
                    {t.reports.targets[entry.targetType]}{" "}
                    {entry.targetType === "message" ? (
                      <code className="text-xs text-muted-foreground">
                        {entry.targetId.slice(0, 8)}
                      </code>
                    ) : (
                      <Link
                        href={
                          entry.targetType === "user"
                            ? adminUserHref(entry.targetId)
                            : listingHref(entry.targetId)
                        }
                        className="font-mono text-xs text-primary-ink hover:underline"
                      >
                        {entry.targetId.slice(0, 8)}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entry.admin
                      ? `@${entry.admin.username}`
                      : entry.action === "user_unsuspended"
                        ? t.adminPages.log.automatic
                        : "—"}
                  </td>
                  <td className="max-w-xs px-4 py-3 break-words text-muted-foreground">
                    {entry.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(log.total / log.pageSize)}
        hrefFor={(value) => logHref(filters, value) as typeof routes.adminLog}
      />
    </>
  );
}
