import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { MemberGate } from "@/features/auth/components/member-gate";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false },
};

export default function MessagesPage() {
  const t = getDictionary();
  return (
    <div className="container-page flex flex-col gap-8 pt-6 sm:pt-10">
      <PageHeader title={t.pages.messagesTitle} />
      <MemberGate returnTo={routes.messages}>
        <EmptyState
          icon={MessagesSquare}
          title="Aucune conversation"
          description="Contactez un vendeur depuis une annonce pour démarrer une conversation."
        />
      </MemberGate>
    </div>
  );
}
