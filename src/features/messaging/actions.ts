"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { signInHref } from "@/features/auth/links";
import { getCurrentUser } from "@/features/auth/session";
import { listingHref } from "@/features/listings/links";
import { formText } from "@/lib/forms/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { schedulePushDispatch } from "@/features/notifications/push/schedule";
import { conversationHref } from "./links";
import { getMessages } from "./queries";
import {
  type ChatMessage,
  isMessagePhotoPath,
  MESSAGE_COLUMNS,
  MESSAGE_PHOTO_BUCKET,
  messageBodySchema,
  type PhotoUrls,
  photoCaptionSchema,
} from "./schemas";
import { getT } from "@/i18n/server";
import { translateValidation } from "@/lib/forms/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ContactState = { message?: string };

/** Ouvre (ou retrouve) la conversation avec le vendeur d'une annonce. */
export async function startConversationAction(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const texts = (await getT()).messagingActions;
  const listingId = formText(formData, "listingId");
  if (!UUID.test(listingId)) return { message: texts.listingNotFound };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    redirect(signInHref(listingHref(listingId)));
  }

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_listing_id: listingId,
  });
  if (error || !data) {
    if (error?.code === "PT429") {
      return { message: texts.contactRateLimited };
    }
    if (error?.code === "23514") return { message: texts.contactSelf };
    return { message: texts.contactFailed };
  }
  redirect(conversationHref(data));
}

export type SendMessageResult =
  { status: "sent"; message: ChatMessage } | { status: "error"; message: string };

/**
 * Envoie un message texte, ou une photo (déjà déposée dans le stockage privé
 * de la conversation) avec un texte facultatif.
 */
export async function sendMessageAction(
  conversationId: string,
  body: string,
  photoPath: string | null = null,
): Promise<SendMessageResult> {
  const t = await getT();
  const texts = t.messagingActions;
  if (!UUID.test(conversationId)) return { status: "error", message: texts.conversationNotFound };
  if (photoPath !== null && !isMessagePhotoPath(conversationId, photoPath)) {
    return { status: "error", message: texts.invalidPhoto };
  }
  const parsed = (photoPath ? photoCaptionSchema : messageBodySchema).safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return {
      status: "error",
      message: issue ? translateValidation(issue, t.validation) : texts.invalidMessage,
    };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, body: parsed.data, attachment_path: photoPath })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !data) {
    if (photoPath) {
      // Photo orpheline : son auteur peut la supprimer (politique Storage).
      await supabase.storage.from(MESSAGE_PHOTO_BUCKET).remove([photoPath]);
    }
    if (error?.code === "PT429") {
      return { status: "error", message: texts.sendRateLimited };
    }
    return { status: "error", message: texts.sendFailed };
  }
  revalidatePath(routes.messages);
  schedulePushDispatch({ type: "new_message", actorId: user.id, conversationId });
  return { status: "sent", message: data };
}

export async function markConversationReadAction(conversationId: string): Promise<void> {
  if (!UUID.test(conversationId)) return;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return;
  const { data } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (data && data > 0) revalidatePath(routes.messages);
}

/** Messages plus anciens qu'une date donnée (chargement progressif), avec leurs photos. */
export async function loadOlderMessagesAction(
  conversationId: string,
  before: string,
): Promise<{ messages: ChatMessage[]; photoUrls: PhotoUrls }> {
  const empty = { messages: [], photoUrls: {} };
  if (!UUID.test(conversationId) || Number.isNaN(Date.parse(before))) return empty;
  const user = await getCurrentUser();
  if (!user) return empty;
  return getMessages(conversationId, before).catch(() => empty);
}
