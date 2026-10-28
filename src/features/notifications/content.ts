import type { Route } from "next";
import {
  adminSupportThreadHref,
  adminUserHref,
  publicProfileHref,
  routes,
  supportThreadHref,
} from "@/config/routes";
import { listingHref } from "@/features/listings/links";
import { conversationHref } from "@/features/messaging/links";
import type { Dictionary } from "@/i18n";
import type { Database } from "@/lib/supabase/database.types";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

export type NotificationSubject = {
  type: NotificationType;
  /** Auteur de l'action (lien vers sa fiche pour les alertes anti-spam de l'équipe). */
  actorId?: string | null;
  actorName: string | null;
  actorUsername: string | null;
  listingId: string | null;
  listingTitle: string | null;
  conversationId: string | null;
  /** Texte d'un avertissement ou d'un message de l'équipe, objet d'une demande, motif d'un signalement. */
  note?: string | null;
  /** Demande d'assistance concernée (conversation). */
  supportRequestId?: string | null;
};

const reportReasons = [
  "scam",
  "prohibited_item",
  "counterfeit",
  "inappropriate",
  "harassment",
  "spam",
  "fake_account",
  "other",
] as const;

type ReportReason = (typeof reportReasons)[number];

const isReportReason = (value: string | null | undefined): value is ReportReason =>
  reportReasons.some((reason) => reason === value);

const TITLE_MAX = 60;

function shorten(value: string, max = TITLE_MAX): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** Titre et texte d'une notification (page Notifications et notifications push). */
export function describeNotification(
  subject: Pick<NotificationSubject, "type" | "actorName" | "listingTitle" | "note">,
  t: Pick<Dictionary, "notifications" | "reports">,
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
    case "admin_message":
      return { title, body: copy.bodies.admin_message(subject.note ?? null) };
    case "install_guide":
      return { title, body: copy.bodies.install_guide };
    case "support_message":
      return {
        title,
        body: copy.bodies.support_message(actor, subject.note ? shorten(subject.note) : null),
      };
    case "staff_report":
      if (subject.note === "spam_banned_word" || subject.note === "spam_publication_limit") {
        return { title, body: copy.bodies[subject.note](actor) };
      }
      return {
        title,
        body: copy.bodies.staff_report(
          actor,
          t.reports.reasons[isReportReason(subject.note) ? subject.note : "other"],
          listing,
        ),
      };
  }
}

/** Page ouverte en cliquant sur la notification. */
export function notificationHref(
  subject: Pick<
    NotificationSubject,
    | "type"
    | "actorId"
    | "actorUsername"
    | "listingId"
    | "conversationId"
    | "note"
    | "supportRequestId"
  >,
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
    case "admin_message":
      return routes.notifications;
    case "support_reply":
      return subject.supportRequestId
        ? supportThreadHref(subject.supportRequestId)
        : routes.support;
    case "install_guide":
      return routes.install;
    case "support_message":
      return subject.supportRequestId
        ? adminSupportThreadHref(subject.supportRequestId)
        : routes.adminSupport;
    case "staff_report":
      return subject.note?.startsWith("spam_") && subject.actorId
        ? adminUserHref(subject.actorId)
        : routes.adminReports;
  }
}
