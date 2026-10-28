"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes, supportThreadHref } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { schedulePushDispatch } from "@/features/notifications/push/schedule";
import { type FormState, fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { getT } from "@/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type SupportField,
  type SupportMessageField,
  supportMessageSchema,
  supportRequestSchema,
} from "./schemas";

/** Envoie une demande à l'assistance (contact ou contestation d'un retrait d'annonce). */
export async function createSupportRequestAction(
  _previous: FormState<SupportField>,
  formData: FormData,
): Promise<FormState<SupportField>> {
  const t = await getT();
  const texts = t.supportActions;
  const values = { subject: formText(formData, "subject"), message: formText(formData, "message") };
  const parsed = supportRequestSchema.safeParse({
    ...values,
    kind: formText(formData, "kind") || "contact",
    listingId: formText(formData, "listingId"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired, values };

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      kind: parsed.data.kind,
      listing_id: parsed.data.listingId,
      subject: parsed.data.subject,
      message: parsed.data.message,
    })
    .select("id")
    .single();
  if (error || !data) {
    const message =
      error.code === "PT429"
        ? texts.rateLimited
        : error.code === "23505"
          ? texts.appealPending
          : error.code === "P0002"
            ? texts.notAppealable
            : texts.failed;
    return { status: "error", message, values };
  }
  // L'équipe est notifiée par la base ; envoi en push après la réponse.
  schedulePushDispatch({ type: "support_message", actorId: user.id });
  revalidatePath(routes.support);
  redirect(supportThreadHref(data.id));
}

/** Ajoute un message à une conversation d'assistance (auteur de la demande). */
export async function sendSupportMessageAction(
  _previous: FormState<SupportMessageField>,
  formData: FormData,
): Promise<FormState<SupportMessageField>> {
  const t = await getT();
  const texts = t.supportActions;
  const values = { body: formText(formData, "body") };
  const parsed = supportMessageSchema.safeParse({
    requestId: formText(formData, "requestId"),
    ...values,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: texts.sessionExpired, values };

  const { error } = await supabase
    .from("support_messages")
    .insert({ request_id: parsed.data.requestId, body: parsed.data.body });
  if (error) {
    const message =
      error.code === "PT429"
        ? texts.messageRateLimited
        : error.code === "22023"
          ? texts.requestClosed
          : error.code === "P0002" || error.code === "42501"
            ? texts.notFound
            : texts.failed;
    return { status: "error", message, values };
  }
  schedulePushDispatch({ type: "support_message", actorId: user.id });
  revalidatePath(supportThreadHref(parsed.data.requestId));
  revalidatePath(routes.support);
  return { status: "success" };
}
