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
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.pages.messagesTitle, robots: { index: false } };
}

async function Inbox() {
  const conversations = await getConversations();
  if (conversations.length === 0) {
    const t = await getT();
    return (
      <EmptyState
        icon={MessagesSquare}
        title={t.messagingPages.emptyTitle}
        description={t.messagingPages.emptyBody}
        action={
          <Button asChild>
            <Link href={routes.explore}>{t.messagingPages.explore}</Link>
          </Button>
        }
      />
    );
  }
  return <ConversationList conversations={conversations} />;
}

export default async function MessagesPage() {
  const t = await getT();
  return (
    <div className="container-page flex max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader title={t.pages.messagesTitle} />
      <MemberGate returnTo={routes.messages}>
        <Inbox />
      </MemberGate>
    </div>
  );
}
