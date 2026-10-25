import { ArrowLeft, ChevronRight, ImageOff } from "lucide-react";
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
import { UserActionsMenu } from "@/features/moderation/components/user-actions-menu";
import { hasBlocked } from "@/features/moderation/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.messagingPages.conversation, robots: { index: false } };
}

export default async function ConversationPage(props: PageProps<"/messages/[id]">) {
  const { id } = await props.params;
  const { user } = await requireUser(conversationHref(id));
  const conversation = await getConversation(id);
  if (!conversation) notFound();
  const t = await getT();

  const isBuyer = conversation.buyer_id === user.id;
  const other = isBuyer ? conversation.seller : conversation.buyer;
  const { messages, photoUrls } = await getMessages(conversation.id);

  // L'utilisateur ne voit que ses propres blocages.
  const blockedByMe = other ? await hasBlocked(user.id, other.id) : false;

  const disabledReason = !other
    ? t.messagingPages.deletedAccount
    : blockedByMe
      ? t.messagingPages.blocked
      : null;

  const listing = conversation.listing;
  const mainImage = listing
    ? [...listing.images].sort((a, b) => a.sort_order - b.sort_order)[0]
    : undefined;
  const name = other?.display_name ?? t.messaging.deletedUser;

  return (
    <div
      data-immersive
      className="container-page flex min-h-dvh max-w-3xl flex-col md:min-h-[calc(100dvh-4rem)] lg:min-h-dvh"
    >
      <header className="sticky top-0 z-30 -mx-4 flex flex-col gap-2 border-b border-border bg-background/95 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:mx-0 sm:px-0 md:top-16 md:pt-4 lg:top-0">
        <div className="flex items-center gap-2">
          <Link
            href={routes.messages}
            className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
            aria-label={t.messagingPages.back}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <Avatar name={name} src={avatarUrl(other?.avatar_path)} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-[0.95rem] leading-tight font-semibold">
              {other ? (
                <Link href={publicProfileHref(other.username)} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {isBuyer ? t.messagingPages.seller : t.messagingPages.interestedBuyer}
            </p>
          </div>
          {other ? (
            <UserActionsMenu
              user={{ id: other.id, username: other.username, displayName: name }}
              initialBlocked={blockedByMe}
              returnTo={conversationHref(conversation.id)}
              showProfileLink
            />
          ) : null}
        </div>
        {listing ? (
          <Link
            href={listingHref(listing.id)}
            className="flex items-center gap-3 rounded-xl bg-muted/70 p-2 transition-colors hover:bg-muted"
          >
            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-card">
              {mainImage ? (
                <Image
                  src={listingImageUrl(mainImage.storage_path) ?? ""}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <ImageOff
                  className="absolute inset-0 m-auto size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{listing.title}</span>
              <span className="text-sm font-bold">
                {listing.price === null ? t.listing.priceTbd : t.format.price(listing.price)}
              </span>
            </span>
            {listing.status !== "active" ? <ListingStatusBadge status={listing.status} /> : null}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ) : (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            {t.messagingPages.listingGone}
          </p>
        )}
      </header>

      <ChatView
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={messages}
        initialPhotoUrls={photoUrls}
        initialHasMore={messages.length >= MESSAGES_PAGE_SIZE}
        disabledReason={disabledReason}
      />
    </div>
  );
}
