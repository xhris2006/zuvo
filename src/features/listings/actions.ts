"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { isAvailableCity } from "@/features/locations/queries";
import { schedulePushDispatch } from "@/features/notifications/push/schedule";
import { getT } from "@/i18n/server";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import { translateValidation, vm } from "@/lib/forms/validation";
import { createSupabaseServerClient, type TypedSupabaseClient } from "@/lib/supabase/server";
import { LISTING_IMAGE_BUCKET } from "./image-url";
import { listingHref } from "./links";
import {
  type ListingField,
  type ListingImageInput,
  listingFieldsSchema,
  listingImagesSchema,
  publicationErrors,
  sellerStatusSchema,
} from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DbError = { code?: string; message?: string } | null;

/** Traduit les erreurs de la base liées aux annonces. */
function listingErrorMessage(t: ServerDictionary, error: DbError): string {
  const texts = t.listingActions;
  const message = error?.message ?? "";
  if (error?.code === "PT429") return texts.rateLimited;
  if (error?.code === "42501") return texts.forbidden;
  if (message.includes("listing_requires_image")) return texts.requiresImage;
  if (message.includes("listing_image_limit_reached")) return texts.imageLimit;
  if (message.includes("listing_removed_by_moderation")) return texts.removedByModeration;
  if (message.includes("listing_cannot_return_to_draft")) return texts.cannotReturnToDraft;
  if (message.includes("listing_banned_word")) return texts.bannedWord;
  if (message.includes("new_account_publication_limit")) return texts.newAccountLimit;
  if (error?.code === "23514") return texts.invalidData;
  return texts.generic;
}

/**
 * Publication refusée par l'anti-spam : la base revérifie le refus puis
 * prévient l'équipe (au plus une alerte par membre et par heure).
 */
async function reportSpamBlock(
  supabase: TypedSupabaseClient,
  userId: string,
  error: DbError,
  text: { title: string; description: string },
) {
  const message = error?.message ?? "";
  if (
    !message.includes("listing_banned_word") &&
    !message.includes("new_account_publication_limit")
  ) {
    return;
  }
  const { data } = await supabase.rpc("report_spam_block", {
    p_title: text.title,
    p_description: text.description,
  });
  if (data) schedulePushDispatch({ type: "staff_report", actorId: userId });
}

function revalidateListing(listingId: string) {
  revalidatePath(listingHref(listingId));
  revalidatePath(routes.profile);
  revalidatePath(routes.home);
  revalidatePath(routes.explore);
}

// -----------------------------------------------------------------------------
// Enregistrement des champs
// -----------------------------------------------------------------------------
export type SaveListingResult =
  | { status: "saved"; listingId: string }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Partial<Record<ListingField, string>>;
    };

/**
 * Crée ou met à jour les champs d'une annonce. Avec l'intention « publish »,
 * l'annonce doit être complète (la publication elle-même a lieu après l'envoi
 * des photos, dans finalizeListingAction).
 */
export async function saveListingAction(
  listingId: string | null,
  formData: FormData,
): Promise<SaveListingResult> {
  const t = await getT();
  const parsed = listingFieldsSchema.safeParse({
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    category: formText(formData, "category"),
    condition: formText(formData, "condition"),
    price: formText(formData, "price"),
    city: formText(formData, "city"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom<ListingField>(parsed.error, t) };
  }
  const fields = parsed.data;

  if (formText(formData, "intent") === "publish") {
    const missing = Object.entries(publicationErrors(fields)).map(([field, code]) => [
      field,
      translateValidation(code, t.validation),
    ]);
    if (missing.length > 0) {
      return {
        status: "error",
        message: t.listingActions.completeToPublish,
        fieldErrors: Object.fromEntries(missing),
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: t.listingActions.sessionExpired };
  if (listingId !== null && !UUID.test(listingId)) {
    return { status: "error", message: t.listingActions.notFound };
  }

  let categoryId: string | null = null;
  if (fields.category) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", fields.category)
      .eq("is_active", true)
      .maybeSingle();
    if (!category) {
      return {
        status: "error",
        fieldErrors: { category: translateValidation(vm("categoryInvalid"), t.validation) },
      };
    }
    categoryId = category.id;
  }
  if (fields.city && !(await isAvailableCity(fields.city))) {
    return {
      status: "error",
      fieldErrors: { city: translateValidation(vm("cityInvalid"), t.validation) },
    };
  }

  const values = {
    title: fields.title,
    description: fields.description,
    price: fields.price,
    condition: fields.condition,
    city: fields.city,
    category_id: categoryId,
  };

  if (listingId === null) {
    const { data, error } = await supabase.from("listings").insert(values).select("id").single();
    if (error || !data) {
      await reportSpamBlock(supabase, user.id, error, values);
      return { status: "error", message: listingErrorMessage(t, error) };
    }
    return { status: "saved", listingId: data.id };
  }

  const { data, error } = await supabase
    .from("listings")
    .update(values)
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    await reportSpamBlock(supabase, user.id, error, values);
    return { status: "error", message: listingErrorMessage(t, error) };
  }
  if (!data) return { status: "error", message: t.listingActions.notFound };
  return { status: "saved", listingId };
}

// -----------------------------------------------------------------------------
// Photos et publication
// -----------------------------------------------------------------------------
export type FinalizeListingResult =
  { status: "ok"; listingId: string } | { status: "error"; message: string };

export async function finalizeListingAction(input: {
  listingId: string;
  images: ListingImageInput[];
  publish: boolean;
}): Promise<FinalizeListingResult> {
  const t = await getT();
  const { listingId, publish } = input;
  const images = listingImagesSchema.safeParse(input.images);
  if (!UUID.test(listingId) || !images.success) {
    return { status: "error", message: t.listingActions.invalidPhotos };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: t.listingActions.sessionExpired };

  const folder = `${user.id}/${listingId}/`;
  if (images.data.some((image) => "path" in image && !image.path.startsWith(folder))) {
    return { status: "error", message: t.listingActions.invalidPhotos };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!listing) return { status: "error", message: t.listingActions.notFound };
  if ((publish || listing.status !== "draft") && images.data.length === 0) {
    return { status: "error", message: t.listingActions.requiresImage };
  }

  const { data: removed, error } = await supabase.rpc("sync_listing_images", {
    p_listing_id: listingId,
    p_images: images.data,
  });
  if (error) return { status: "error", message: listingErrorMessage(t, error) };

  // Suppression des fichiers retirés (sans bloquer en cas d'échec).
  if (removed && removed.length > 0) {
    await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(removed);
  }

  if (publish && listing.status === "draft") {
    const { error: publishError } = await supabase
      .from("listings")
      .update({ status: "active" })
      .eq("id", listingId);
    if (publishError) {
      await reportSpamBlock(supabase, user.id, publishError, { title: "", description: "" });
      return { status: "error", message: listingErrorMessage(t, publishError) };
    }
    schedulePushDispatch({ type: "followed_user_listing", actorId: user.id, listingId });
  }

  revalidateListing(listingId);
  return { status: "ok", listingId };
}

// -----------------------------------------------------------------------------
// Statut et suppression
// -----------------------------------------------------------------------------
export type ListingActionState = { message?: string };

export async function updateListingStatusAction(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const t = await getT();
  const listingId = formText(formData, "listingId");
  const status = sellerStatusSchema.safeParse(formText(formData, "status"));
  if (!UUID.test(listingId) || !status.success) return { message: t.listingActions.invalidAction };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { message: t.listingActions.sessionExpired };

  const { data, error } = await supabase
    .from("listings")
    .update({ status: status.data })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { message: listingErrorMessage(t, error) };
  if (!data) return { message: t.listingActions.notFound };

  revalidateListing(listingId);
  return {};
}

export async function deleteListingAction(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const t = await getT();
  const listingId = formText(formData, "listingId");
  if (!UUID.test(listingId)) return { message: t.listingActions.notFound };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { message: t.listingActions.sessionExpired };

  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  const { data, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { message: listingErrorMessage(t, error) };
  if (!data) {
    return { message: t.listingActions.cannotDelete };
  }

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length > 0) await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(paths);

  revalidateListing(listingId);
  redirect(`${routes.profile}?annonce=supprimee` as Route);
}
