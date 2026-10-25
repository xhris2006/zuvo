import type { Route } from "next";
import { publicProfileHref, routes } from "@/config/routes";
import { listingHref } from "@/features/listings/links";
import { conversationHref } from "@/features/messaging/links";
import { type Dictionary, getDictionary } from "@/i18n";
import type { Database } from "@/lib/supabase/database.types";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

export type NotificationSubject = {
  type: NotificationType;
  actorName: string | null;
  actorUsername: string | null;
  listingId: string | null;
  listingTitle: string | null;
  conversationId: string | null;
  /** Texte d'un avertissement de la modération. */
  note?: string | null;
};

const TITLE_MAX = 60;

function shorten(value: string, max = TITLE_MAX): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** Titre et texte d'une notification (page Notifications et notifications push). */
export function describeNotification(
  subject: Pick<NotificationSubject, "type" | "actorName" | "listingTitle" | "note">,
  t: Dictionary = getDictionary(),
): { title: string; body: string } {
  const copy = t.notifications;
  const actor = subject.actorName ? shorten(subject.actorName, 40) : copy.someone;
  const listing = subject.listingTitle ? shorten(subject.listingTitle) : null;
  const title = copy.titles[subject.type];
  switch (subject.type) {
    case "new_message":
      return { title, body: copy.bodies.new_message(actor, listing) };
    case "new_follower":
      return { title, body: copy.bodies.new_follower(actor) };
    case "followed_user_listing":
      return {
        title,
        body: copy.bodies.followed_user_listing(actor, listing ?? copy.unavailableListing),
      };
    case "listing_favorited":
      return {
        title,
        body: copy.bodies.listing_favorited(actor, listing ?? copy.unavailableListing),
      };
    case "listing_removed":
      return { title, body: copy.bodies.listing_removed(listing ?? copy.unavailableListing) };
    case "moderation_warning":
      return { title, body: copy.bodies.moderation_warning(subject.note ?? null) };
    case "support_reply":
      return {
        title,
        body: copy.bodies.support_reply(subject.note ? shorten(subject.note) : null),
      };
  }
}

/** Page ouverte en cliquant sur la notification. */
export function notificationHref(
  subject: Pick<NotificationSubject, "type" | "actorUsername" | "listingId" | "conversationId">,
): Route {
  switch (subject.type) {
    case "new_message":
      return subject.conversationId ? conversationHref(subject.conversationId) : routes.messages;
    case "new_follower":
      return subject.actorUsername ? publicProfileHref(subject.actorUsername) : routes.profile;
    case "followed_user_listing":
    case "listing_favorited":
    case "listing_removed":
      return subject.listingId ? listingHref(subject.listingId) : routes.notifications;
    case "moderation_warning":
      return routes.notifications;
    case "support_reply":
      return routes.support;
  }
}
