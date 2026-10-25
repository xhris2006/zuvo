import { Megaphone, Pencil, Trash2 } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { AnnouncementForm } from "@/features/admin/components/announcement-form";
import {
  deleteAnnouncementAction,
  toggleAnnouncementAction,
} from "@/features/admin/management-actions";
import { type AdminAnnouncement, getAdminAnnouncements } from "@/features/admin/management-queries";
import { requireAdmin } from "@/features/admin/queries";
import { toCameroonDateTimeInput } from "@/features/admin/schemas";
import { getT } from "@/i18n/server";
import type { ServerDictionary } from "@/i18n/server-dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.announcement };
}

function announcementState(t: ServerDictionary, item: AdminAnnouncement, now = Date.now()) {
  const labels = t.adminPages.announcements.states;
  if (!item.isActive) return { label: labels.disabled, variant: "neutral" as const };
  if (item.startsAt && new Date(item.startsAt).getTime() > now) {
    return { label: labels.scheduled, variant: "warning" as const };
  }
  if (item.endsAt && new Date(item.endsAt).getTime() <= now) {
    return { label: labels.ended, variant: "neutral" as const };
  }
  return { label: labels.shown, variant: "success" as const };
}

export default async function AdminAnnouncementsPage(props: PageProps<"/admin/message">) {
  await requireAdmin(routes.adminAnnouncements);
  const t = await getT();
  const editId = (await props.searchParams).modifier;
  const announcements = await getAdminAnnouncements();
  const editing = announcements.find((item) => item.id === editId);

  return (
    <>
      <PageHeader
        title={t.adminUi.nav.announcement}
        description={t.adminPages.announcements.description}
      />
      <section aria-labelledby="announcement-form" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="announcement-form" className="text-lg font-bold tracking-tight">
            {editing ? t.adminPages.announcements.edit : t.adminPages.announcements.create}
          </h2>
          {editing ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.adminAnnouncements}>{t.adminUi.cancel}</Link>
            </Button>
          ) : null}
        </div>
        <AnnouncementForm
          key={editing?.id ?? "new"}
          defaults={{
            id: editing?.id,
            kind: editing?.kind ?? "info",
            message: editing?.message ?? "",
            linkUrl: editing?.linkUrl ?? "",
            startsAt: toCameroonDateTimeInput(editing?.startsAt ?? null),
            endsAt: toCameroonDateTimeInput(editing?.endsAt ?? null),
            isActive: editing?.isActive ?? true,
          }}
        />
      </section>

      <section aria-labelledby="announcement-list" className="flex flex-col gap-3">
        <h2 id="announcement-list" className="text-lg font-bold tracking-tight">
          {t.adminPages.announcements.messages}
        </h2>
        {announcements.length === 0 ? (
          <EmptyState icon={Megaphone} headingLevel="h3" title={t.adminPages.announcements.empty} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {announcements.map((item) => {
              const state = announcementState(t, item);
              return (
                <li key={item.id} className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={state.variant}>{state.label}</Badge>
                    <Badge variant={item.kind === "maintenance" ? "warning" : "primary"}>
                      {item.kind === "maintenance"
                        ? t.announcement.maintenance
                        : t.announcement.info}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.startsAt
                        ? t.adminPages.announcements.from(t.format.dateTime(item.startsAt))
                        : ""}
                      {item.endsAt
                        ? t.adminPages.announcements.to(t.format.dateTime(item.endsAt))
                        : ""}
                      {!item.startsAt && !item.endsAt
                        ? t.adminPages.announcements.created(t.format.dateTime(item.createdAt))
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm break-words">{item.message}</p>
                  {item.linkUrl ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {t.adminPages.announcements.link(item.linkUrl)}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${routes.adminAnnouncements}?modifier=${item.id}` as Route}>
                        <Pencil aria-hidden="true" />
                        {t.adminPages.announcements.modify}
                      </Link>
                    </Button>
                    <form action={toggleAnnouncementAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="active" value={String(!item.isActive)} />
                      <SubmitButton variant="outline" size="sm">
                        {item.isActive
                          ? t.adminUi.rowActions.deactivate
                          : t.adminUi.rowActions.activate}
                      </SubmitButton>
                    </form>
                    <form action={deleteAnnouncementAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton variant="ghost" size="sm" className="text-danger">
                        <Trash2 aria-hidden="true" />
                        {t.adminPages.announcements.delete}
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
