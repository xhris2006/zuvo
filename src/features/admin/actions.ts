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
import { isCurrentUserAdmin } from "./queries";

const FORBIDDEN = "Action réservée à l'administration.";

type RpcError = { code?: string } | null;

function errorMessage(error: RpcError): string {
  switch (error?.code) {
    case "42501":
      return FORBIDDEN;
    case "P0002":
      return "Élément introuvable ou déjà traité.";
    case "22023":
      return "Indiquez un motif d'au moins 3 caractères.";
    default:
      return "L'action a échoué. Veuillez réessayer.";
  }
}

/**
 * Contexte d'une action d'administration. Le rôle est vérifié ici pour un
 * message clair, puis de nouveau par la base de données (seule garantie).
 */
async function adminContext() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user || !(await isCurrentUserAdmin())) return null;
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
  const supabase = await adminContext();
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
  const supabase = await adminContext();
  if (!listingId.success || !supabase) return;
  await supabase.rpc("admin_restore_listing", { p_listing_id: listingId.data });
  revalidateAdmin();
  revalidatePath(`/annonces/${listingId.data}`);
}

const suspensionSchema = z.object({
  userId: z.uuid(),
  suspended: z.enum(["true", "false"]).transform((value) => value === "true"),
  reason: z.string().trim().max(500),
  reportId: optionalUuid,
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
  });
  if (!parsed.success) return { status: "error", message: "Requête invalide." };
  if (parsed.data.suspended && parsed.data.reason.length < 3) {
    return {
      status: "error",
      fieldErrors: { reason: "Indiquez un motif d'au moins 3 caractères." },
    };
  }
  const supabase = await adminContext();
  if (!supabase) return { status: "error", message: FORBIDDEN };

  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user_id: parsed.data.userId,
    p_suspended: parsed.data.suspended,
    p_reason: parsed.data.reason || undefined,
    p_report_id: parsed.data.reportId ?? undefined,
  });
  if (error) return { status: "error", message: errorMessage(error) };
  revalidateAdmin();
  return {
    status: "success",
    message: parsed.data.suspended ? "Compte suspendu." : "Compte réactivé.",
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
  const supabase = await adminContext();
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
  const supabase = await adminContext();
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
