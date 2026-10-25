import { ClipboardList, Megaphone } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { TeamMessageForm } from "@/features/admin/components/team-message-form";
import { getBroadcastAudienceCount } from "@/features/admin/management-queries";
import { requireStaff } from "@/features/admin/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.notify };
}

const linkClass =
  "inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4";

export default async function AdminNotifyPage() {
  const { role } = await requireStaff(routes.adminNotify);
  const t = await getT();
  const copy = t.adminPages.notify;
  const isAdmin = role === "admin";
  const audience = isAdmin ? await getBroadcastAudienceCount() : null;

  return (
    <>
      <PageHeader title={t.adminUi.nav.notify} description={copy.description} />
      <TeamMessageForm canBroadcast={isAdmin} />
      <p className="text-xs text-muted-foreground">
        {audience === null ? copy.moderatorNote : copy.members(t.format.count(audience))}
      </p>
      <ul className="flex flex-col gap-2">
        <li>
          <Link href={`${routes.adminLog}?action=user_messaged` as Route} className={linkClass}>
            <ClipboardList className="size-4" aria-hidden="true" />
            {copy.historyUsers}
          </Link>
        </li>
        {isAdmin ? (
          <>
            <li>
              <Link href={`${routes.adminLog}?vue=configuration` as Route} className={linkClass}>
                <ClipboardList className="size-4" aria-hidden="true" />
                {copy.historyAll}
              </Link>
            </li>
            <li>
              <Link href={routes.adminAnnouncements} className={linkClass}>
                <Megaphone className="size-4" aria-hidden="true" />
                {copy.bannerTip}
              </Link>
            </li>
          </>
        ) : null}
      </ul>
    </>
  );
}
