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
import { getT } from "@/i18n/server";
import { adminErrorMessage } from "./errors";
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

type Texts = Awaited<ReturnType<typeof getT>>["adminActions"];

async function texts(): Promise<Texts> {
  return (await getT()).adminActions;
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
  reason: z.string().trim().min(3).max(500),
  reportId: optionalUuid,
});

export type ModerationField = "reason";

export async function removeListingAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const tx = await texts();
  const parsed = removeListingSchema.safeParse({
    listingId: formText(formData, "listingId"),
    reason: formText(formData, "reason"),
    reportId: formText(formData, "reportId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { reason: tx.reasonMin },
      values: { reason: formText(formData, "reason") },
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { error } = await supabase.rpc("admin_remove_listing", {
    p_listing_id: parsed.data.listingId,
    p_reason: parsed.data.reason,
    p_report_id: parsed.data.reportId ?? undefined,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  schedulePushDispatch({ type: "listing_removed", listingId: parsed.data.listingId });
  revalidateAdmin();
  revalidatePath(`/annonces/${parsed.data.listingId}`);
  return { status: "success", message: tx.listingRemoved };
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
  const tx = await texts();
  const parsed = removeListingSchema.safeParse({
    listingId: formText(formData, "listingId"),
    reason: formText(formData, "reason"),
    reportId: "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { reason: tx.reasonMin },
      values: { reason: formText(formData, "reason") },
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };
  const { error } = await supabase.rpc("admin_restore_listing", {
    p_listing_id: parsed.data.listingId,
    p_note: parsed.data.reason,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidateAdmin();
  revalidatePath(`/annonces/${parsed.data.listingId}`);
  return { status: "success", message: tx.listingRestored };
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
  const tx = await texts();
  const parsed = suspensionSchema.safeParse({
    userId: formText(formData, "userId"),
    suspended: formText(formData, "suspended"),
    reason: formText(formData, "reason"),
    reportId: formText(formData, "reportId"),
    duration: formText(formData, "duration") || "permanent",
    until: formText(formData, "until"),
  });
  if (!parsed.success) return { status: "error", message: tx.invalidRequest };
  if (parsed.data.suspended && parsed.data.reason.length < 3) {
    return {
      status: "error",
      fieldErrors: { reason: tx.reasonMin },
    };
  }
  const end = parsed.data.suspended
    ? suspensionEnd(parsed.data.duration, parsed.data.until)
    : ({ ok: true, until: null } as const);
  if (!end.ok) {
    return {
      status: "error",
      message: tx.suspension[end.error],
      values: { reason: parsed.data.reason },
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user_id: parsed.data.userId,
    p_suspended: parsed.data.suspended,
    p_reason: parsed.data.reason || undefined,
    p_report_id: parsed.data.reportId ?? undefined,
    p_until: end.until?.toISOString(),
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidateAdmin();
  return {
    status: "success",
    message: !parsed.data.suspended
      ? tx.userReactivated
      : end.until
        ? tx.userSuspendedUntil
        : tx.userSuspended,
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
  const tx = await texts();
  const parsed = reportUpdateSchema.safeParse({
    reportId: formText(formData, "reportId"),
    status: formText(formData, "status"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) return { status: "error", message: tx.invalidRequest };
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { error } = await supabase.rpc("admin_update_report", {
    p_report_id: parsed.data.reportId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidateAdmin();
  return { status: "success", message: tx.reportUpdated };
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
  const tx = await texts();
  if (!z.uuid().safeParse(reportId).success) return { status: "error", message: tx.invalidRequest };
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };
  const { data, error } = await supabase.rpc("admin_get_reported_message", {
    p_report_id: reportId,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
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
const reasonSchema = z.string().trim().min(3).max(500);

function invalidReason(texts: Texts, formData: FormData): FormState<ModerationField> {
  return {
    status: "error",
    fieldErrors: { reason: texts.textMin },
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
  const tx = await texts();
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const reason = reasonSchema.safeParse(formText(formData, "reason"));
  if (!userId.success) return { status: "error", message: tx.invalidRequest };
  if (!reason.success) return invalidReason(tx, formData);
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { error } = await supabase.rpc("admin_warn_user", {
    p_user_id: userId.data,
    p_message: reason.data,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  schedulePushDispatch({ type: "moderation_warning" });
  revalidateUser(userId.data);
  return { status: "success", message: tx.warningSent };
}

/** Retire la photo, la présentation et/ou le nom affiché d'un profil. */
export async function resetProfileAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const tx = await texts();
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const reason = reasonSchema.safeParse(formText(formData, "reason"));
  const avatar = formData.get("avatar") === "on";
  const bio = formData.get("bio") === "on";
  const displayName = formData.get("displayName") === "on";
  if (!userId.success) return { status: "error", message: tx.invalidRequest };
  if (!avatar && !bio && !displayName) {
    return {
      status: "error",
      message: tx.resetNothing,
      values: { reason: formText(formData, "reason") },
    };
  }
  if (!reason.success) return invalidReason(tx, formData);
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { data: oldAvatar, error } = await supabase.rpc("admin_reset_profile", {
    p_user_id: userId.data,
    p_reason: reason.data,
    p_avatar: avatar,
    p_bio: bio,
    p_display_name: displayName,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  // La photo retirée n'appartient pas à l'administrateur : suppression en service_role.
  if (oldAvatar) await createSupabaseAdminClient()?.storage.from("avatars").remove([oldAvatar]);
  revalidateUser(userId.data);
  revalidatePath("/u", "layout");
  return { status: "success", message: tx.profileReset };
}

/** Retire d'un coup toutes les annonces en ligne d'un utilisateur. */
export async function removeUserListingsAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const tx = await texts();
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const reason = reasonSchema.safeParse(formText(formData, "reason"));
  if (!userId.success) return { status: "error", message: tx.invalidRequest };
  if (!reason.success) return invalidReason(tx, formData);
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { data: count, error } = await supabase.rpc("admin_remove_user_listings", {
    p_user_id: userId.data,
    p_reason: reason.data,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  if (count) schedulePushDispatch({ type: "listing_removed" });
  revalidateUser(userId.data);
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: count === 0 ? tx.noListingsToRemove : tx.listingsRemoved(count),
  };
}

// -----------------------------------------------------------------------------
// Assistance
// -----------------------------------------------------------------------------
export type SupportAnswerField = "response";

const supportAnswerSchema = z.object({
  requestId: z.uuid(),
  response: z.string().trim().max(2000),
  close: z.boolean(),
});

/** Répond à une demande d'assistance (notification à son auteur) et/ou la clôt. */
export async function answerSupportRequestAction(
  _previous: FormState<SupportAnswerField>,
  formData: FormData,
): Promise<FormState<SupportAnswerField>> {
  const tx = await texts();
  const parsed = supportAnswerSchema.safeParse({
    requestId: formText(formData, "requestId"),
    response: formText(formData, "response"),
    close: formData.get("close") === "on",
  });
  const values = { response: formText(formData, "response") };
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: {
        response: parsed.error.issues[0]?.code === "too_big" ? tx.responseMax : tx.invalidResponse,
      },
      values,
    };
  }
  if (!parsed.data.close && parsed.data.response.length < 3) {
    return {
      status: "error",
      fieldErrors: { response: tx.responseMin },
      values,
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { error } = await supabase.rpc("admin_answer_support_request", {
    p_request_id: parsed.data.requestId,
    p_response: parsed.data.response,
    p_close: parsed.data.close,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
  if (parsed.data.response) schedulePushDispatch({ type: "support_reply" });
  revalidateAdmin();
  return {
    status: "success",
    message: parsed.data.response ? tx.replySent : tx.requestClosed,
  };
}

// -----------------------------------------------------------------------------
// Messages de l'équipe (reçus en notification)
// -----------------------------------------------------------------------------
const teamMessageSchema = z.string().trim().min(3).max(500);

/** Message à un membre depuis sa fiche (champ « reason » de la fenêtre de modération). */
export async function messageUserAction(
  _previous: FormState<ModerationField>,
  formData: FormData,
): Promise<FormState<ModerationField>> {
  const tx = await texts();
  const userId = z.uuid().safeParse(formText(formData, "userId"));
  const message = teamMessageSchema.safeParse(formText(formData, "reason"));
  if (!userId.success) return { status: "error", message: tx.invalidRequest };
  if (!message.success) {
    return {
      status: "error",
      fieldErrors: { reason: tx.messageLength },
      values: { reason: formText(formData, "reason") },
    };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden };

  const { error } = await supabase.rpc("admin_message_user", {
    p_user_id: userId.data,
    p_message: message.data,
  });
  if (error) {
    return {
      status: "error",
      message: adminErrorMessage(tx, error),
      values: { reason: message.data },
    };
  }
  schedulePushDispatch({ type: "admin_message" });
  revalidateUser(userId.data);
  return { status: "success", message: tx.messageSent };
}

export type TeamMessageField = "username" | "message";

const teamMessageFormSchema = z.object({
  recipients: z.enum(["one", "all"]),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@/, ""))
    .pipe(z.string().max(30)),
  message: teamMessageSchema,
});

/**
 * Message de l'équipe à un membre (nom d'utilisateur) ou à tous les membres
 * (administrateurs uniquement, vérifié par la base).
 */
export async function sendTeamMessageAction(
  _previous: FormState<TeamMessageField>,
  formData: FormData,
): Promise<FormState<TeamMessageField>> {
  const tx = await texts();
  const values = {
    username: formText(formData, "username"),
    message: formText(formData, "message"),
  };
  const parsed = teamMessageFormSchema.safeParse({
    recipients: formText(formData, "recipients") || "one",
    ...values,
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "message") {
      return { status: "error", fieldErrors: { message: tx.messageLength }, values };
    }
    if (field === "username") {
      return { status: "error", fieldErrors: { username: tx.usernameNotFound }, values };
    }
    return { status: "error", message: tx.invalidRequest, values };
  }
  const supabase = await staffContext();
  if (!supabase) return { status: "error", message: tx.forbidden, values };

  if (parsed.data.recipients === "all") {
    const { data: count, error } = await supabase.rpc("admin_broadcast_message", {
      p_message: parsed.data.message,
    });
    if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
    if (count) schedulePushDispatch({ type: "admin_message" });
    revalidateAdmin();
    return { status: "success", message: tx.broadcastSent(count ?? 0) };
  }

  if (!parsed.data.username) {
    return { status: "error", fieldErrors: { username: tx.usernameRequired }, values };
  }
  const { data: recipient } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (!recipient) {
    return { status: "error", fieldErrors: { username: tx.usernameNotFound }, values };
  }
  const { error } = await supabase.rpc("admin_message_user", {
    p_user_id: recipient.id,
    p_message: parsed.data.message,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
  schedulePushDispatch({ type: "admin_message" });
  revalidateUser(recipient.id);
  return { status: "success", message: tx.messageSent };
}
