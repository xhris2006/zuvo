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
import { getDictionary } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Journal de modération" };

function JournalTabs({
  current,
  showConfig,
}: {
  current: "moderation" | "configuration";
  showConfig: boolean;
}) {
  if (!showConfig) return null;
  const tabs = [
    { key: "moderation", label: "Modération", href: routes.adminLog },
    {
      key: "configuration",
      label: "Configuration",
      href: `${routes.adminLog}?vue=configuration` as Route,
    },
  ] as const;
  return (
    <nav aria-label="Journaux" className="flex gap-2">
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
  const t = getDictionary();
  const log = await getConfigActivity(page);
  return (
    <>
      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune modification enregistrée" />
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
                {formatDateTime(entry.createdAt)}
                {entry.adminUsername ? ` · par @${entry.adminUsername}` : ""}
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
function LogFilters({ filters }: { filters: ModerationLogFilters }) {
  const t = getDictionary();
  const active = logHref(filters) !== routes.adminLog;
  return (
    <form
      action={routes.adminLog}
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-action" className="text-sm font-medium">
          Action
        </label>
        <Select id="log-action" name="action" defaultValue={filters.action ?? ""}>
          <option value="">Toutes</option>
          {Constants.public.Enums.moderation_action_type.map((action) => (
            <option key={action} value={action}>
              {t.admin.actions[action]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-target" className="text-sm font-medium">
          Cible
        </label>
        <Select id="log-target" name="cible" defaultValue={filters.targetType ?? ""}>
          <option value="">Toutes</option>
          {Constants.public.Enums.report_target_type.map((target) => (
            <option key={target} value={target}>
              {t.reports.targets[target]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-member" className="text-sm font-medium">
          Membre de l&apos;équipe
        </label>
        <Input
          id="log-member"
          name="membre"
          defaultValue={filters.admin ?? ""}
          placeholder="@pseudo"
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="log-from" className="text-sm font-medium">
            Du
          </label>
          <Input id="log-from" name="du" type="date" defaultValue={filters.from ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="log-to" className="text-sm font-medium">
            Au
          </label>
          <Input id="log-to" name="au" type="date" defaultValue={filters.to ?? ""} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">
          Filtrer
        </Button>
        {active ? (
          <Button asChild variant="ghost">
            <Link href={routes.adminLog}>Effacer</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default async function AdminLogPage(props: PageProps<"/admin/journal">) {
  const { role } = await requireStaff(routes.adminLog);
  const t = getDictionary();
  const searchParams = await props.searchParams;
  const page = parsePageParam(searchParams.page);
  const showConfig = role === "admin";
  if (showConfig && searchParams.vue === "configuration") {
    return (
      <>
        <PageHeader
          title="Journal de configuration"
          description="Modifications des catégories, des villes et du message global, non modifiables."
        />
        <JournalTabs current="configuration" showConfig />
        <ConfigurationLog page={page} />
      </>
    );
  }
  const filters = parseModerationLogFilters(searchParams);
  const log = await getModerationLog(page, filters);

  return (
    <>
      <PageHeader
        title="Journal de modération"
        description="Toutes les actions de l'équipe de modération, non modifiables."
      />
      <JournalTabs current="moderation" showConfig={showConfig} />
      <LogFilters filters={filters} />
      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        {log.total === 0 ? "Aucune action" : `${log.total} action${log.total > 1 ? "s" : ""}`}
      </p>
      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune action ne correspond à ces filtres" />
      ) : (
        // Zone défilante atteignable au clavier (tableau large sur mobile).
        <div
          role="region"
          aria-label="Actions de modération"
          tabIndex={0}
          className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Action
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Cible
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Par
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Motif / note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {log.items.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
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
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {entry.targetId.slice(0, 8)}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entry.admin
                      ? `@${entry.admin.username}`
                      : entry.action === "user_unsuspended"
                        ? "Automatique"
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
