import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { listingImageUrl } from "@/features/listings/image-url";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { conversationHref } from "../links";
import type { ConversationSummary } from "../queries";

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {conversations.map((conversation) => {
        const name = conversation.other_display_name ?? "Utilisateur supprimé";
        const image = conversation.listing_image_path
          ? listingImageUrl(conversation.listing_image_path)
          : null;
        const unread = conversation.unread_count > 0;
        return (
          <li key={conversation.conversation_id}>
            <Link
              href={conversationHref(conversation.conversation_id)}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
            >
              <Avatar name={name} src={avatarUrl(conversation.other_avatar_path)} size="lg" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate", unread ? "font-bold" : "font-medium")}>
                    {name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(conversation.last_message_at)}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {conversation.listing_title ?? "Annonce indisponible"}
                </span>
                <span
                  className={cn(
                    "truncate text-sm",
                    unread ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {conversation.last_message_body
                    ? `${conversation.last_message_is_mine ? "Vous : " : ""}${conversation.last_message_body}`
                    : "Aucun message pour le moment"}
                </span>
              </span>
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {image ? (
                  <Image src={image} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <ImageOff
                    className="m-auto mt-3.5 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </span>
              {unread ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                  <span className="sr-only"> messages non lus</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
