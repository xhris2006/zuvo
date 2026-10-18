import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { MemberGate } from "@/features/auth/components/member-gate";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { getConversations } from "@/features/messaging/queries";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false },
};

async function Inbox() {
  const conversations = await getConversations();
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Aucune conversation"
        description="Contactez un vendeur depuis une annonce pour démarrer une conversation."
        action={
          <Button asChild>
            <Link href={routes.explore}>Explorer les annonces</Link>
          </Button>
        }
      />
    );
  }
  return <ConversationList conversations={conversations} />;
}

export default function MessagesPage() {
  const t = getDictionary();
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-6 sm:pt-10">
      <PageHeader title={t.pages.messagesTitle} />
      <MemberGate returnTo={routes.messages}>
        <Inbox />
      </MemberGate>
    </div>
  );
}
