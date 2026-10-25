import { ScrollText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { routes } from "@/config/routes";
import { getConfigActivity } from "@/features/admin/management-queries";
import { getModerationLog, requireStaff } from "@/features/admin/queries";
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

/** « Animaux (is_active, name) » → « Animaux (activation, nom) ». */
function readableSummary(summary: string, fields: Record<string, string>) {
  return summary.replace(
    /\(([a-z_, ]+)\)$/,
    (_match, keys: string) =>
      `(${keys
        .split(", ")
        .map((key) => fields[key] ?? key)
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
                  {readableSummary(entry.summary, t.admin.fields)}
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
  const log = await getModerationLog(page);

  return (
    <>
      <PageHeader
        title="Journal de modération"
        description="Toutes les actions de l'équipe de modération, non modifiables."
      />
      <JournalTabs current="moderation" showConfig={showConfig} />
      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune action enregistrée" />
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
                    <code className="text-xs text-muted-foreground">
                      {entry.targetId.slice(0, 8)}
                    </code>
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
        hrefFor={(value) =>
          (value === 1
            ? routes.adminLog
            : `${routes.adminLog}?page=${value}`) as typeof routes.adminLog
        }
      />
    </>
  );
}
