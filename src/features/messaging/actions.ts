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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_EXPIRED = "Votre session a expiré. Reconnectez-vous.";

export type ContactState = { message?: string };

/** Ouvre (ou retrouve) la conversation avec le vendeur d'une annonce. */
export async function startConversationAction(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const listingId = formText(formData, "listingId");
  if (!UUID.test(listingId)) return { message: "Annonce introuvable." };

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
      return { message: "Vous avez contacté beaucoup de vendeurs récemment. Réessayez plus tard." };
    }
    if (error?.code === "23514") return { message: "Vous ne pouvez pas vous contacter vous-même." };
    return {
      message:
        "Impossible de contacter ce vendeur : l'annonce n'est plus disponible ou le contact est bloqué.",
    };
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
  if (!UUID.test(conversationId)) return { status: "error", message: "Conversation introuvable." };
  if (photoPath !== null && !isMessagePhotoPath(conversationId, photoPath)) {
    return { status: "error", message: "Photo invalide." };
  }
  const parsed = (photoPath ? photoCaptionSchema : messageBodySchema).safeParse(body);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Message invalide." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: SESSION_EXPIRED };

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
      return {
        status: "error",
        message: "Vous envoyez beaucoup de messages. Patientez un instant.",
      };
    }
    return {
      status: "error",
      message: "Impossible d'envoyer ce message dans cette conversation.",
    };
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
