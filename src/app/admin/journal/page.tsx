import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { routes } from "@/config/routes";
import { getModerationLog, requireAdmin } from "@/features/admin/queries";
import { getDictionary } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = { title: "Journal de modération" };

export default async function AdminLogPage(props: PageProps<"/admin/journal">) {
  await requireAdmin(routes.adminLog);
  const t = getDictionary();
  const page = parsePageParam((await props.searchParams).page);
  const log = await getModerationLog(page);

  return (
    <>
      <PageHeader
        title="Journal de modération"
        description="Toutes les actions de l'administration, non modifiables."
      />
      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune action enregistrée" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
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
                  <td className="px-4 py-3">{entry.admin ? `@${entry.admin.username}` : "—"}</td>
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
