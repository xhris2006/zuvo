"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { getT } from "@/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type SupportField, supportRequestSchema } from "./schemas";

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

  const { error } = await supabase.from("support_requests").insert({
    kind: parsed.data.kind,
    listing_id: parsed.data.listingId,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  if (error) {
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
  revalidatePath(routes.support);
  return {
    status: "success",
    message: parsed.data.kind === "appeal" ? texts.appealSent : texts.requestSent,
  };
}
