import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { MemberGate } from "@/features/auth/components/member-gate";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

export default function NotificationsPage() {
  const t = getDictionary();
  return (
    <div className="container-page flex flex-col gap-8 pt-6 sm:pt-10">
      <PageHeader title={t.pages.notificationsTitle} />
      <MemberGate returnTo={routes.notifications}>
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous serez prévenu ici des nouveaux messages, abonnés et activités sur vos annonces."
        />
      </MemberGate>
    </div>
  );
}
