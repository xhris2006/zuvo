"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, formText } from "@/lib/forms/form-state";
import { schedulePushDispatch } from "@/features/notifications/push/schedule";
import { MESSAGE_PHOTO_BUCKET } from "@/features/messaging/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminErrorMessage as errorMessage, FORBIDDEN } from "./errors";
import { getCurrentStaffRole } from "./queries";
import { suspensionEnd } from "./suspension";

/**
 * Contexte d'une action de modération (administrateur ou modérateur). Le rôle
 * est vérifié ici pour un message clair, puis de nouveau par la base de
 * données (seule garantie).
 */
async function staffContext() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user || !(await getCurrentStaffRole())) return null;
  return supabase;
}

function revalidateAdmin() {
  revalidatePath(routes.admin, "layout");
}

const optionalUuid = z
  .string()
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

const removeListingSchema = z.object({
  listingId: z.uuid(),
  reason: z.string().trim().min(3, "Indiquez un motif d'au moins 3 caractères.").max(500),
  reportId: optionalUuid,
});

export type ModerationField = "reason";

export async function removeListingAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const parsed = removeListingSchema.safeParse({
    listingId: formText(formData, "listingId"),
    reason: formText(formData, "reason"),
    reportId: formText(formData, "reportId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { reason: parsed.error.issues[0]?.message ?? "Motif invalide." },
      values: { reason: formText(formData, "reason") },
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { error } = await supabase.rpc("admin_remove_listing", {
    p_listing_id: parsed.data.listingId,
    p_reason: parsed.data.reason,
    p_report_id: parsed.data.reportId ?? undefined,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  schedulePushDispatch({ type: "listing_removed", listingId: parsed.data.listingId });
  revalidateAdmin();
  revalidatePath(`/annonces/${parsed.data.listingId}`);
  return { status: "success", message: "Annonce retirée. Le vendeur a été prévenu." };
}

export async function restoreListingAction(formData: FormData): Promise<void> {
  const listingId = z.uuid().safeParse(formText(formData, "listingId"));
  const supabase = await staffContext();
  if (!listingId.success || !supabase) return;
  await supabase.rpc("admin_restore_listing", { p_listing_id: listingId.data });
  revalidateAdmin();
  revalidatePath(`/annonces/${listingId.data}`);
}

/** Rétablit une annonce retirée, avec un motif inscrit au journal. */
export async function restoreListingWithReasonAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const parsed = removeListingSchema.safeParse({
    listingId: formText(formData, "listingId"),
    reason: formText(formData, "reason"),
    reportId: "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { reason: parsed.error.issues[0]?.message ?? "Motif invalide." },
      values: { reason: formText(formData, "reason") },
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };
  const { error } = await supabase.rpc("admin_restore_listing", {
    p_listing_id: parsed.data.listingId,
    p_note: parsed.data.reason,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  revalidateAdmin();
  revalidatePath(`/annonces/${parsed.data.listingId}`);
  return {
    status: "success",
    message: "Annonce rétablie. Son vendeur peut la remettre en vente.",
  };
}

const suspensionSchema = z.object({
  userId: z.uuid(),
  suspended: z.enum(["true", "false"]).transform((value) => value === "true"),
  reason: z.string().trim().max(500),
  reportId: optionalUuid,
  duration: z.string().max(20),
  until: z.string().max(20),
});

export async function setUserSuspensionAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const parsed = suspensionSchema.safeParse({
    userId: formText(formData, "userId"),
    suspended: formText(formData, "suspended"),
    reason: formText(formData, "reason"),
    reportId: formText(formData, "reportId"),
    duration: formText(formData, "duration") || "permanent",
    until: formText(formData, "until"),
  });
  if (!parsed.success) return { status: "error", message: "Requête invalide." };
  if (parsed.data.suspended && parsed.data.reason.length < 3) {
    return {
      status: "error",
      fieldErrors: { reason: "Indiquez un motif d'au moins 3 caractères." },
    };
  }
  const end = parsed.data.suspended
    ? suspensionEnd(parsed.data.duration, parsed.data.until)
    : ({ ok: true, until: null } as const);
  if (!end.ok) {
    return { status: "error", message: end.message, values: { reason: parsed.data.reason } };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user_id: parsed.data.userId,
    p_suspended: parsed.data.suspended,
    p_reason: parsed.data.reason || undefined,
    p_report_id: parsed.data.reportId ?? undefined,
    p_until: end.until?.toISOString(),
  });
  if (error) return { status: "error", message: errorMessage(error) };
  revalidateAdmin();
  return {
    status: "success",
    message: !parsed.data.suspended
      ? "Compte réactivé."
      : end.until
        ? "Compte suspendu temporairement. La suspension sera levée automatiquement."
        : "Compte suspendu.",
  };
}

const reportUpdateSchema = z.object({
  reportId: z.uuid(),
  status: z.enum(["in_review", "resolved", "dismissed"]),
  note: z.string().trim().max(1000),
});

export async function updateReportStatusAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reportUpdateSchema.safeParse({
    reportId: formText(formData, "reportId"),
    status: formText(formData, "status"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) return { status: "error", message: "Requête invalide." };
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { error } = await supabase.rpc("admin_update_report", {
    p_report_id: parsed.data.reportId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  revalidateAdmin();
  return { status: "success", message: "Signalement mis à jour." };
}

export type ReportedMessage = {
  body: string | null;
  /** Lien signé de courte durée vers la photo du message, s'il y en a une. */
  photoUrl: string | null;
  createdAt: string;
  senderUsername: string | null;
};

/** Affiche le message signalé (consultation journalisée par la base). */
export async function viewReportedMessageAction(
  reportId: string,
): Promise<
  { status: "ok"; message: ReportedMessage | null } | { status: "error"; message: string }
> {
  if (!z.uuid().safeParse(reportId).success)
    return { status: "error", message: "Requête invalide." };
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };
  const { data, error } = await supabase.rpc("admin_get_reported_message", {
    p_report_id: reportId,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  const row = data?.[0];
  if (!row) return { status: "ok", message: null };

  // La base a vérifié le rôle et journalisé la consultation : la photo (bucket
  // privé, hors conversation de l'administrateur) est lue en service_role.
  let photoUrl: string | null = null;
  if (row.attachment_path) {
    const { data: signed } = (await createSupabaseAdminClient()
      ?.storage.from(MESSAGE_PHOTO_BUCKET)
      .createSignedUrl(row.attachment_path, 5 * 60)) ?? { data: null };
    photoUrl = signed?.signedUrl ?? null;
  }
  return {
    status: "ok",
    message: {
      body: row.body,
      photoUrl,
      createdAt: row.created_at,
      senderUsername: row.sender_username,
    },
  };
}

// -----------------------------------------------------------------------------
// Outils sur les comptes (fiche utilisateur)
// -----------------------------------------------------------------------------
const reasonSchema = z
  .string()
  .trim()
  .min(3, "Indiquez un texte d'au moins 3 caractères.")
  .max(500);

function invalidReason(formData: FormData, message?: string): FormState<ModerationField> {
  return {
    status: "error",
    fieldErrors: { reason: message ?? "Indiquez un texte d'au moins 3 caractères." },
    values: { reason: formText(formData, "reason") },
  };
}

function revalidateUser(userId: string) {
  revalidateAdmin();
  revalidatePath(`/admin/utilisateurs/${userId}`);
}

/** Avertissement écrit, reçu en notification (et en push) par l'utilisateur. */
export async function warnUserAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const reason = reasonSchema.safeParse(formText(formData, "reason"));
  if (!userId.success) return { status: "error", message: "Requête invalide." };
  if (!reason.success) return invalidReason(formData, reason.error.issues[0]?.message);
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { error } = await supabase.rpc("admin_warn_user", {
    p_user_id: userId.data,
    p_message: reason.data,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  schedulePushDispatch({ type: "moderation_warning" });
  revalidateUser(userId.data);
  return { status: "success", message: "Avertissement envoyé à l'utilisateur." };
}

/** Retire la photo, la présentation et/ou le nom affiché d'un profil. */
export async function resetProfileAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const reason = reasonSchema.safeParse(formText(formData, "reason"));
  const avatar = formData.get("avatar") === "on";
  const bio = formData.get("bio") === "on";
  const displayName = formData.get("displayName") === "on";
  if (!userId.success) return { status: "error", message: "Requête invalide." };
  if (!avatar && !bio && !displayName) {
    return {
      status: "error",
      message: "Choisissez au moins un élément à réinitialiser.",
      values: { reason: formText(formData, "reason") },
    };
  }
  if (!reason.success) return invalidReason(formData, reason.error.issues[0]?.message);
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { data: oldAvatar, error } = await supabase.rpc("admin_reset_profile", {
    p_user_id: userId.data,
    p_reason: reason.data,
    p_avatar: avatar,
    p_bio: bio,
    p_display_name: displayName,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  // La photo retirée n'appartient pas à l'administrateur : suppression en service_role.
  if (oldAvatar) await createSupabaseAdminClient()?.storage.from("avatars").remove([oldAvatar]);
  revalidateUser(userId.data);
  revalidatePath("/u", "layout");
  return { status: "success", message: "Profil réinitialisé." };
}

/** Retire d'un coup toutes les annonces en ligne d'un utilisateur. */
export async function removeUserListingsAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const reason = reasonSchema.safeParse(formText(formData, "reason"));
  if (!userId.success) return { status: "error", message: "Requête invalide." };
  if (!reason.success) return invalidReason(formData, reason.error.issues[0]?.message);
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { data: count, error } = await supabase.rpc("admin_remove_user_listings", {
    p_user_id: userId.data,
    p_reason: reason.data,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  if (count) schedulePushDispatch({ type: "listing_removed" });
  revalidateUser(userId.data);
  revalidatePath("/", "layout");
  return {
    status: "success",
    message:
      count === 0
        ? "Aucune annonce en ligne à retirer."
        : `${count} annonce${count > 1 ? "s" : ""} retirée${count > 1 ? "s" : ""}. Le vendeur a été prévenu.`,
  };
}

// -----------------------------------------------------------------------------
// Assistance
// -----------------------------------------------------------------------------
export type SupportAnswerField = "response";

const supportAnswerSchema = z.object({
  requestId: z.uuid(),
  response: z.string().trim().max(2000, "2 000 caractères au maximum."),
  close: z.boolean(),
});

/** Répond à une demande d'assistance (notification à son auteur) et/ou la clôt. */
export async function answerSupportRequestAction(
  _previous: FormState<SupportAnswerField>,
  formData: FormData,
): Promise<FormState<SupportAnswerField>> {
  const parsed = supportAnswerSchema.safeParse({
    requestId: formText(formData, "requestId"),
    response: formText(formData, "response"),
    close: formData.get("close") === "on",
  });
  const values = { response: formText(formData, "response") };
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { response: parsed.error.issues[0]?.message ?? "Réponse invalide." },
      values,
    };
  }
  if (!parsed.data.close && parsed.data.response.length < 3) {
    return {
      status: "error",
      fieldErrors: {
        response: "Écrivez une réponse d'au moins 3 caractères, ou cochez « Clore ».",
      },
      values,
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { error } = await supabase.rpc("admin_answer_support_request", {
    p_request_id: parsed.data.requestId,
    p_response: parsed.data.response,
    p_close: parsed.data.close,
  });
  if (error) return { status: "error", message: errorMessage(error), values };
  if (parsed.data.response) schedulePushDispatch({ type: "support_reply" });
  revalidateAdmin();
  return {
    status: "success",
    message: parsed.data.response
      ? "Réponse envoyée. L'utilisateur a été prévenu."
      : "Demande close.",
  };
}
