"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { routes } from "@/config/routes";
import { listUserFiles, removeUserFiles } from "@/features/account/storage-cleanup";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { vm } from "@/lib/forms/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { adminErrorMessage } from "./errors";
import { isCurrentUserAdmin } from "./queries";
import {
  type AnnouncementField,
  type AntiSpamField,
  announcementFormSchema,
  antiSpamSettingsSchema,
  categoryFormSchema,
  cityFormSchema,
  normalizeBannedWord,
  type ReferenceField,
} from "./schemas";

/**
 * Contexte d'une action réservée aux administrateurs. Le rôle est vérifié ici
 * pour un message clair, puis de nouveau par la base de données (fonctions
 * SQL et politiques RLS), seule garantie.
 */
async function adminContext() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user || !(await isCurrentUserAdmin())) return null;
  return { supabase, user };
}

/** Les catégories et villes apparaissent sur tout le site. */
function revalidateCatalog() {
  revalidatePath("/", "layout");
}

// -----------------------------------------------------------------------------
// Rôles
// -----------------------------------------------------------------------------
const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["admin", "moderator"]),
  granted: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function setRoleAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const tx = t.adminActions;
  const parsed = roleSchema.safeParse({
    userId: formText(formData, "userId"),
    role: formText(formData, "role"),
    granted: formText(formData, "granted"),
  });
  if (!parsed.success) return { status: "error", message: tx.invalidRequest };
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };

  const { error } = await context.supabase.rpc("admin_set_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_granted: parsed.data.granted,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidatePath(routes.admin, "layout");
  const label = tx.roleNames[parsed.data.role];
  return {
    status: "success",
    message: parsed.data.granted ? tx.roleGranted(label) : tx.roleRevoked(label),
  };
}

// -----------------------------------------------------------------------------
// Suppression d'un compte
// -----------------------------------------------------------------------------
export type DeleteUserField = "reason" | "confirmation";

const deleteUserSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(3, vm("textMin", 3)).max(500),
  confirmation: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@/, "")),
});

/**
 * Supprime définitivement un compte (profil, annonces, messages… par cascade)
 * et ses photos. La base vérifie la demande, la suppression passe par la clé
 * service_role (côté serveur uniquement), puis la base l'inscrit au journal.
 */
export async function deleteUserAction(
  _previous: FormState<DeleteUserField>,
  formData: FormData,
): Promise<FormState<DeleteUserField>> {
  const t = await getT();
  const tx = t.adminActions;
  const parsed = deleteUserSchema.safeParse({
    userId: formText(formData, "userId"),
    reason: formText(formData, "reason"),
    confirmation: formText(formData, "confirmation"),
  });
  const values = { reason: formText(formData, "reason") };
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };

  const { data: username, error: checkError } = await context.supabase.rpc(
    "admin_check_user_deletion",
    { p_user_id: parsed.data.userId },
  );
  if (checkError || !username) {
    return { status: "error", message: adminErrorMessage(tx, checkError), values };
  }
  if (parsed.data.confirmation !== username) {
    return {
      status: "error",
      fieldErrors: { confirmation: tx.confirmUsername(username) },
      values,
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      status: "error",
      message: tx.serviceKeyMissing,
      values,
    };
  }
  const files = await listUserFiles(admin, parsed.data.userId);
  const { error: deleteError } = await admin.auth.admin.deleteUser(parsed.data.userId);
  if (deleteError) {
    return { status: "error", message: tx.deleteFailed, values };
  }
  if (!(await removeUserFiles(admin, files))) {
    // Aucun identifiant ni chemin dans les journaux.
    console.error("Suppression de compte (administration) : fichiers non supprimés.");
  }
  const { error: logError } = await context.supabase.rpc("admin_log_user_deletion", {
    p_user_id: parsed.data.userId,
    p_username: username,
    p_reason: parsed.data.reason,
  });
  if (logError) console.error("Suppression de compte (administration) : journal non écrit.");

  revalidatePath("/", "layout");
  redirect(`${routes.adminUsers}?supprime=1` as Route);
}

// -----------------------------------------------------------------------------
// Catégories
// -----------------------------------------------------------------------------
async function nextSortOrder(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  table: "categories" | "cities",
) {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

export async function createCategoryAction(
  _previous: FormState<ReferenceField>,
  formData: FormData,
): Promise<FormState<ReferenceField>> {
  const t = await getT();
  const tx = t.adminActions;
  const values = { name: formText(formData, "name"), slug: formText(formData, "slug") };
  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  const { error } = await context.supabase.from("categories").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    sort_order: await nextSortOrder(context.supabase, "categories"),
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
  revalidateCatalog();
  return { status: "success", message: tx.categoryAdded(parsed.data.name) };
}

const renameSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().trim().min(2, vm("nameMin", 2)).max(60, vm("maxChars", 60)),
  region: z.string().trim().max(60),
});

export async function renameCategoryAction(
  _previous: FormState<ReferenceField>,
  formData: FormData,
): Promise<FormState<ReferenceField>> {
  const t = await getT();
  const tx = t.adminActions;
  const parsed = renameSchema.safeParse({
    id: formText(formData, "id"),
    name: formText(formData, "name"),
    region: "",
  });
  if (!parsed.success || !z.uuid().safeParse(parsed.data.id).success) {
    return {
      status: "error",
      fieldErrors: parsed.success ? {} : fieldErrorsFrom(parsed.error, t),
      message: parsed.success ? tx.invalidRequest : undefined,
    };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  const { error } = await context.supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id);
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidateCatalog();
  return { status: "success", message: tx.nameSaved };
}

/** Active ou désactive une catégorie (formulaire sans JavaScript). */
export async function toggleCategoryAction(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formText(formData, "id"));
  const active = formText(formData, "active") === "true";
  const context = await adminContext();
  if (!id.success || !context) return;
  await context.supabase.from("categories").update({ is_active: active }).eq("id", id.data);
  revalidateCatalog();
}

/**
 * Échange la position d'un élément avec son voisin (direction -1 : monter,
 * 1 : descendre). Les positions sont renumérotées de 10 en 10.
 */
async function moveRow(
  table: "categories" | "cities",
  key: string,
  direction: number,
): Promise<void> {
  const context = await adminContext();
  if (!context) return;
  const { supabase } = context;
  const rows =
    table === "categories"
      ? (
          (
            await supabase
              .from("categories")
              .select("id, sort_order")
              .is("parent_id", null)
              .order("sort_order")
              .order("name")
          ).data ?? []
        ).map((row) => ({ key: row.id, sortOrder: row.sort_order }))
      : (
          (
            await supabase
              .from("cities")
              .select("slug, sort_order")
              .order("sort_order")
              .order("name")
          ).data ?? []
        ).map((row) => ({ key: row.slug, sortOrder: row.sort_order }));
  const index = rows.findIndex((row) => row.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return;
  const order = rows.map((row) => row.key);
  [order[index], order[target]] = [order[target]!, order[index]!];

  for (const [position, rowKey] of order.entries()) {
    const sortOrder = (position + 1) * 10;
    if (rows.find((row) => row.key === rowKey)?.sortOrder === sortOrder) continue;
    if (table === "categories") {
      await supabase.from("categories").update({ sort_order: sortOrder }).eq("id", rowKey);
    } else {
      await supabase.from("cities").update({ sort_order: sortOrder }).eq("slug", rowKey);
    }
  }
  revalidateCatalog();
}

const moveSchema = z.object({
  id: z.string().min(1).max(60),
  direction: z.enum(["-1", "1"]).transform(Number),
});

export async function moveCategoryAction(formData: FormData): Promise<void> {
  const parsed = moveSchema.safeParse({
    id: formText(formData, "id"),
    direction: formText(formData, "direction"),
  });
  if (!parsed.success || !z.uuid().safeParse(parsed.data.id).success) return;
  await moveRow("categories", parsed.data.id, parsed.data.direction);
}

// -----------------------------------------------------------------------------
// Villes
// -----------------------------------------------------------------------------
export async function createCityAction(
  _previous: FormState<ReferenceField>,
  formData: FormData,
): Promise<FormState<ReferenceField>> {
  const t = await getT();
  const tx = t.adminActions;
  const values = {
    name: formText(formData, "name"),
    region: formText(formData, "region"),
    slug: formText(formData, "slug"),
  };
  const parsed = cityFormSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  const { error } = await context.supabase.from("cities").insert({
    slug: parsed.data.slug,
    name: parsed.data.name,
    region: parsed.data.region,
    sort_order: await nextSortOrder(context.supabase, "cities"),
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
  revalidateCatalog();
  return { status: "success", message: tx.cityAdded(parsed.data.name) };
}

const citySlug = z.string().regex(/^[a-z0-9-]{1,60}$/);

export async function updateCityAction(
  _previous: FormState<ReferenceField>,
  formData: FormData,
): Promise<FormState<ReferenceField>> {
  const t = await getT();
  const tx = t.adminActions;
  const parsed = renameSchema.safeParse({
    id: formText(formData, "id"),
    name: formText(formData, "name"),
    region: formText(formData, "region"),
  });
  if (!parsed.success || !citySlug.safeParse(parsed.data.id).success) {
    return {
      status: "error",
      fieldErrors: parsed.success ? {} : fieldErrorsFrom(parsed.error, t),
      message: parsed.success ? tx.invalidRequest : undefined,
    };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  const { error } = await context.supabase
    .from("cities")
    .update({ name: parsed.data.name, region: parsed.data.region })
    .eq("slug", parsed.data.id);
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidateCatalog();
  return { status: "success", message: tx.citySaved };
}

export async function toggleCityAction(formData: FormData): Promise<void> {
  const slug = citySlug.safeParse(formText(formData, "id"));
  const active = formText(formData, "active") === "true";
  const context = await adminContext();
  if (!slug.success || !context) return;
  await context.supabase.from("cities").update({ is_active: active }).eq("slug", slug.data);
  revalidateCatalog();
}

export async function moveCityAction(formData: FormData): Promise<void> {
  const parsed = moveSchema.safeParse({
    id: formText(formData, "id"),
    direction: formText(formData, "direction"),
  });
  if (!parsed.success || !citySlug.safeParse(parsed.data.id).success) return;
  await moveRow("cities", parsed.data.id, parsed.data.direction);
}

// -----------------------------------------------------------------------------
// Message global
// -----------------------------------------------------------------------------
export async function saveAnnouncementAction(
  _previous: FormState<AnnouncementField>,
  formData: FormData,
): Promise<FormState<AnnouncementField>> {
  const t = await getT();
  const tx = t.adminActions;
  const values = {
    kind: formText(formData, "kind"),
    message: formText(formData, "message"),
    linkUrl: formText(formData, "linkUrl"),
    startsAt: formText(formData, "startsAt"),
    endsAt: formText(formData, "endsAt"),
  };
  const id = formText(formData, "id");
  const parsed = announcementFormSchema.safeParse({
    ...values,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  if (id && !z.uuid().safeParse(id).success) {
    return { status: "error", message: tx.invalidRequest };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };

  const row = {
    kind: parsed.data.kind,
    message: parsed.data.message,
    link_url: parsed.data.linkUrl || null,
    starts_at: parsed.data.startsAt?.toISOString() ?? null,
    ends_at: parsed.data.endsAt?.toISOString() ?? null,
    is_active: parsed.data.isActive,
  };
  const { error } = id
    ? await context.supabase.from("site_announcements").update(row).eq("id", id)
    : await context.supabase.from("site_announcements").insert(row);
  if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: id ? tx.announcementUpdated : tx.announcementPublished,
  };
}

export async function toggleAnnouncementAction(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formText(formData, "id"));
  const active = formText(formData, "active") === "true";
  const context = await adminContext();
  if (!id.success || !context) return;
  await context.supabase.from("site_announcements").update({ is_active: active }).eq("id", id.data);
  revalidatePath("/", "layout");
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formText(formData, "id"));
  const context = await adminContext();
  if (!id.success || !context) return;
  await context.supabase.from("site_announcements").delete().eq("id", id.data);
  revalidatePath("/", "layout");
}

// -----------------------------------------------------------------------------
// Anti-spam
// -----------------------------------------------------------------------------
export async function saveAntiSpamSettingsAction(
  _previous: FormState<AntiSpamField>,
  formData: FormData,
): Promise<FormState<AntiSpamField>> {
  const t = await getT();
  const tx = t.adminActions;
  const values = {
    newAccountDays: formText(formData, "newAccountDays"),
    newAccountDailyListings: formText(formData, "newAccountDailyListings"),
  };
  const parsed = antiSpamSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t), values };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  for (const [key, value] of [
    ["new_account_days", parsed.data.newAccountDays],
    ["new_account_daily_listings", parsed.data.newAccountDailyListings],
  ] as const) {
    const { error } = await context.supabase.from("app_settings").update({ value }).eq("key", key);
    if (error) return { status: "error", message: adminErrorMessage(tx, error), values };
  }
  revalidatePath(routes.adminAntiSpam);
  return { status: "success", message: tx.settingsSaved };
}

export async function addBannedWordAction(
  _previous: FormState<AntiSpamField>,
  formData: FormData,
): Promise<FormState<AntiSpamField>> {
  const t = await getT();
  const tx = t.adminActions;
  const raw = formText(formData, "word");
  const word = normalizeBannedWord(raw);
  if (!word) {
    return {
      status: "error",
      fieldErrors: { word: tx.bannedWordInvalid },
      values: { word: raw },
    };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  const { error } = await context.supabase.from("banned_words").insert({ word });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? tx.bannedWordExists(word) : adminErrorMessage(tx, error),
      values: { word: raw },
    };
  }
  revalidatePath(routes.adminAntiSpam);
  return { status: "success", message: tx.bannedWordAdded(word) };
}

export async function removeBannedWordAction(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formText(formData, "id"));
  const context = await adminContext();
  if (!id.success || !context) return;
  await context.supabase.from("banned_words").delete().eq("id", id.data);
  revalidatePath(routes.adminAntiSpam);
}

// -----------------------------------------------------------------------------
// Badge vendeur vérifié
// -----------------------------------------------------------------------------
const verificationSchema = z.object({
  userId: z.uuid(),
  verified: z.enum(["true", "false"]).transform((value) => value === "true"),
  note: z.string().trim().max(500, vm("maxChars", 500)),
});

export async function setSellerVerificationAction(
  _previous: FormState<"note">,
  formData: FormData,
): Promise<FormState<"note">> {
  const t = await getT();
  const tx = t.adminActions;
  const parsed = verificationSchema.safeParse({
    userId: formText(formData, "userId"),
    verified: formText(formData, "verified"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error, t) };
  }
  const context = await adminContext();
  if (!context) return { status: "error", message: tx.forbidden };
  const { error } = await context.supabase.rpc("admin_set_seller_verification", {
    p_user_id: parsed.data.userId,
    p_verified: parsed.data.verified,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { status: "error", message: adminErrorMessage(tx, error) };
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: parsed.data.verified ? tx.badgeGranted : tx.badgeRevoked,
  };
}
