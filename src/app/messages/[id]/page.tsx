import { ArrowLeft, ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { publicProfileHref, routes } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { listingImageUrl } from "@/features/listings/image-url";
import { listingHref } from "@/features/listings/links";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import { ChatView } from "@/features/messaging/components/chat-view";
import { conversationHref } from "@/features/messaging/links";
import { getConversation, getMessages } from "@/features/messaging/queries";
import { MESSAGES_PAGE_SIZE } from "@/features/messaging/schemas";
import { BlockButton } from "@/features/moderation/components/block-button";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { hasBlocked } from "@/features/moderation/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false },
};

export default async function ConversationPage(props: PageProps<"/messages/[id]">) {
  const { id } = await props.params;
  const { user } = await requireUser(conversationHref(id));
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const isBuyer = conversation.buyer_id === user.id;
  const other = isBuyer ? conversation.seller : conversation.buyer;
  const messages = await getMessages(conversation.id);

  // L'utilisateur ne voit que ses propres blocages.
  const blockedByMe = other ? await hasBlocked(user.id, other.id) : false;

  const disabledReason = !other
    ? "Cet utilisateur a supprimé son compte : vous ne pouvez plus lui écrire."
    : blockedByMe
      ? "Vous avez bloqué cet utilisateur. Débloquez-le pour lui écrire."
      : null;

  const listing = conversation.listing;
  const mainImage = listing
    ? [...listing.images].sort((a, b) => a.sort_order - b.sort_order)[0]
    : undefined;
  const name = other?.display_name ?? "Utilisateur supprimé";

  return (
    <div data-immersive className="container-page flex max-w-3xl flex-col pt-3 sm:pt-6">
      <header className="flex flex-col gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={routes.messages}
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Retour aux messages"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <Avatar name={name} src={avatarUrl(other?.avatar_path)} />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-semibold">
              {other ? (
                <Link href={publicProfileHref(other.username)} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isBuyer ? "Vendeur" : "Acheteur intéressé"}
            </p>
          </div>
          {other ? (
            <div className="ml-auto flex shrink-0 items-center">
              <ReportDialog
                targetType="user"
                targetId={other.id}
                signedIn
                returnTo={conversationHref(conversation.id)}
                className="px-2"
              />
              <BlockButton
                userId={other.id}
                username={other.username}
                displayName={name}
                initialBlocked={blockedByMe}
                className="px-2"
              />
            </div>
          ) : null}
        </div>
        {listing ? (
          <Link
            href={listingHref(listing.id)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-accent"
          >
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {mainImage ? (
                <Image
                  src={listingImageUrl(mainImage.storage_path) ?? ""}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <ImageOff
                  className="m-auto mt-3.5 size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{listing.title}</span>
              <span className="text-sm font-bold">
                {listing.price === null ? "Prix à définir" : formatPrice(listing.price)}
              </span>
            </span>
            {listing.status !== "active" ? <ListingStatusBadge status={listing.status} /> : null}
          </Link>
        ) : (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            L&apos;annonce liée à cette conversation n&apos;est plus disponible.
          </p>
        )}
      </header>

      <ChatView
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={messages}
        initialHasMore={messages.length >= MESSAGES_PAGE_SIZE}
        disabledReason={disabledReason}
      />
    </div>
  );
}
