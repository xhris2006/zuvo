"use server";

import { revalidatePath } from "next/cache";
import { publicProfileHref, routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportSchema } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_EXPIRED = "Votre session a expiré. Reconnectez-vous.";

export type ReportField = "reason" | "details";

export async function createReportAction(
  _previous: FormState<ReportField>,
  formData: FormData,
): Promise<FormState<ReportField>> {
  const values = { reason: formText(formData, "reason"), details: formText(formData, "details") };
  const parsed = reportSchema.safeParse({
    targetType: formText(formData, "targetType"),
    targetId: formText(formData, "targetId"),
    ...values,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: SESSION_EXPIRED, values };

  const { error } = await supabase.from("reports").insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
  if (error) {
    const message =
      error.code === "23505"
        ? "Vous avez déjà signalé cet élément : il est en cours de traitement."
        : error.code === "PT429"
          ? "Vous avez envoyé beaucoup de signalements aujourd'hui. Réessayez demain."
          : error.code === "P0002"
            ? "Cet élément n'existe plus ou ne peut pas être signalé."
            : "Le signalement n'a pas pu être envoyé. Veuillez réessayer.";
    return { status: "error", message, values };
  }
  return {
    status: "success",
    message: "Merci. Votre signalement a été transmis à l'équipe de modération.",
  };
}

export type BlockState = { blocked: boolean; message?: string };

/** Bloque ou débloque un utilisateur (l'état réel est relu en base). */
export async function toggleBlockAction(
  _previous: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const targetId = formText(formData, "userId");
  const username = formText(formData, "username");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { blocked: false, message: SESSION_EXPIRED };
  if (!UUID.test(targetId) || targetId === user.id) {
    return { blocked: false, message: "Utilisateur introuvable." };
  }

  const { count } = await supabase
    .from("blocks")
    .select("blocked_id", { count: "exact", head: true })
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);
  const currentlyBlocked = (count ?? 0) > 0;

  const { error } = currentlyBlocked
    ? await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetId)
    : await supabase.from("blocks").insert({ blocked_id: targetId });
  if (error && error.code !== "23505") {
    return { blocked: currentlyBlocked, message: "L'opération a échoué. Veuillez réessayer." };
  }

  revalidatePath(routes.settings);
  revalidatePath(routes.messages, "layout");
  if (/^[a-z0-9_]{3,30}$/.test(username)) revalidatePath(publicProfileHref(username));
  return { blocked: !currentlyBlocked };
}
