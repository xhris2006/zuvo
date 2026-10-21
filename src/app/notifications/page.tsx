import { Bell, CheckCheck, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { PushPrompt } from "@/features/notifications/components/push-prompt";
import { getNotifications } from "@/features/notifications/queries";
import { getDictionary } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/env";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

export default async function NotificationsPage(props: PageProps<"/notifications">) {
  const t = getDictionary();
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
        <PageHeader title={t.pages.notificationsTitle} />
        <AuthRequired returnTo={routes.notifications} />
      </div>
    );
  }

  await requireUser(routes.notifications);
  const page = parsePageParam((await props.searchParams).page);
  const notifications = await getNotifications(page);
  const hasUnread = notifications.items.some((item) => !item.isRead);

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={t.pages.notificationsTitle}
        inlineActions
        actions={
          <>
            {hasUnread ? (
              <form action={markAllNotificationsReadAction}>
                <SubmitButton variant="outline" size="sm" title="Tout marquer comme lu">
                  <CheckCheck aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Tout marquer comme lu</span>
                </SubmitButton>
              </form>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.settings} title="Préférences">
                <Settings aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Préférences</span>
              </Link>
            </Button>
          </>
        }
      />
      <PushPrompt context="notifications" />
      {notifications.items.length > 0 ? (
        <>
          <NotificationList items={notifications.items} />
          <Pagination
            page={page}
            pageCount={Math.ceil(notifications.total / notifications.pageSize)}
            hrefFor={(value) =>
              (value === 1
                ? routes.notifications
                : `${routes.notifications}?page=${value}`) as typeof routes.notifications
            }
          />
        </>
      ) : (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous serez prévenu ici des nouveaux abonnés et de l'activité de vos annonces. Les messages ont leur propre boîte de réception."
        />
      )}
    </div>
  );
}
