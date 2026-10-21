import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { listingImageUrl } from "@/features/listings/image-url";
import { cn } from "@/lib/utils";
import { formatInboxTime } from "../format";
import { conversationHref } from "../links";
import type { ConversationSummary } from "../queries";

/** Liste des conversations : pleine largeur sur mobile, carte sur grand écran. */
export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  return (
    <ul className="-mx-4 border-y border-border bg-card sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card">
      {conversations.map((conversation) => {
        const name = conversation.other_display_name ?? "Utilisateur supprimé";
        const image = conversation.listing_image_path
          ? listingImageUrl(conversation.listing_image_path)
          : null;
        const unread = conversation.unread_count > 0;
        return (
          <li
            key={conversation.conversation_id}
            className="relative after:absolute after:right-0 after:bottom-0 after:left-[5rem] after:h-px after:bg-border last:after:hidden"
          >
            <Link
              href={conversationHref(conversation.conversation_id)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
            >
              <span className="relative shrink-0">
                <Avatar
                  name={name}
                  src={avatarUrl(conversation.other_avatar_path)}
                  size="lg"
                  className="size-[3.25rem]"
                />
                <span className="absolute -right-1 -bottom-1 size-6 overflow-hidden rounded-md border-2 border-card bg-muted">
                  {image ? (
                    <Image src={image} alt="" fill sizes="24px" className="object-cover" />
                  ) : (
                    <ImageOff
                      className="absolute inset-0 m-auto size-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[0.95rem]",
                      unread ? "font-bold" : "font-semibold",
                    )}
                  >
                    {name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      unread ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {formatInboxTime(conversation.last_message_at)}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {conversation.listing_title ?? "Annonce indisponible"}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      unread ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {conversation.last_message_body
                      ? `${conversation.last_message_is_mine ? "Vous : " : ""}${conversation.last_message_body}`
                      : "Aucun message pour le moment"}
                  </span>
                  {unread ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-bold text-primary-foreground">
                      {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                      <span className="sr-only"> messages non lus</span>
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
