"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { isAvailableCity } from "@/features/locations/queries";
import { schedulePushDispatch } from "@/features/notifications/push/schedule";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
const SESSION_EXPIRED = "Votre session a expiré. Reconnectez-vous.";
const GENERIC_ERROR = "L'enregistrement a échoué. Veuillez réessayer.";

type DbError = { code?: string; message?: string } | null;

/** Traduit les erreurs de la base liées aux annonces. */
function listingErrorMessage(error: DbError): string {
  const message = error?.message ?? "";
  if (error?.code === "PT429")
    return "Vous avez publié beaucoup d'annonces récemment. Réessayez demain.";
  if (error?.code === "42501") return "Votre compte ne permet pas de modifier cette annonce.";
  if (message.includes("listing_requires_image")) return "Ajoutez au moins une photo.";
  if (message.includes("listing_image_limit_reached")) return "8 photos au maximum.";
  if (message.includes("listing_removed_by_moderation")) {
    return "Cette annonce a été retirée par la modération et ne peut pas être remise en ligne.";
  }
  if (message.includes("listing_cannot_return_to_draft")) {
    return "Une annonce publiée ne peut pas redevenir un brouillon.";
  }
  if (message.includes("listing_banned_word")) {
    return "Votre annonce contient un terme interdit par les règles du site. Modifiez le titre ou la description.";
  }
  if (message.includes("new_account_publication_limit")) {
    return "Votre compte est récent : vous avez atteint le nombre de publications autorisé pour aujourd'hui. Votre annonce est enregistrée en brouillon, réessayez demain.";
  }
  if (error?.code === "23514") return "Certaines informations sont incomplètes ou invalides.";
  return GENERIC_ERROR;
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
  const parsed = listingFieldsSchema.safeParse({
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    category: formText(formData, "category"),
    condition: formText(formData, "condition"),
    price: formText(formData, "price"),
    city: formText(formData, "city"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom<ListingField>(parsed.error) };
  }
  const fields = parsed.data;

  if (formText(formData, "intent") === "publish") {
    const missing = publicationErrors(fields);
    if (Object.keys(missing).length > 0) {
      return {
        status: "error",
        message: "Complétez les champs indiqués pour publier l'annonce.",
        fieldErrors: missing,
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: SESSION_EXPIRED };
  if (listingId !== null && !UUID.test(listingId)) {
    return { status: "error", message: "Annonce introuvable." };
  }

  let categoryId: string | null = null;
  if (fields.category) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", fields.category)
      .eq("is_active", true)
      .maybeSingle();
    if (!category) return { status: "error", fieldErrors: { category: "Catégorie invalide." } };
    categoryId = category.id;
  }
  if (fields.city && !(await isAvailableCity(fields.city))) {
    return { status: "error", fieldErrors: { city: "Ville invalide." } };
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
    if (error || !data) return { status: "error", message: listingErrorMessage(error) };
    return { status: "saved", listingId: data.id };
  }

  const { data, error } = await supabase
    .from("listings")
    .update(values)
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: listingErrorMessage(error) };
  if (!data) return { status: "error", message: "Annonce introuvable." };
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
  const { listingId, publish } = input;
  const images = listingImagesSchema.safeParse(input.images);
  if (!UUID.test(listingId) || !images.success) {
    return { status: "error", message: "Photos invalides." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: SESSION_EXPIRED };

  const folder = `${user.id}/${listingId}/`;
  if (images.data.some((image) => "path" in image && !image.path.startsWith(folder))) {
    return { status: "error", message: "Photos invalides." };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!listing) return { status: "error", message: "Annonce introuvable." };
  if ((publish || listing.status !== "draft") && images.data.length === 0) {
    return { status: "error", message: "Ajoutez au moins une photo." };
  }

  const { data: removed, error } = await supabase.rpc("sync_listing_images", {
    p_listing_id: listingId,
    p_images: images.data,
  });
  if (error) return { status: "error", message: listingErrorMessage(error) };

  // Suppression des fichiers retirés (sans bloquer en cas d'échec).
  if (removed && removed.length > 0) {
    await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(removed);
  }

  if (publish && listing.status === "draft") {
    const { error: publishError } = await supabase
      .from("listings")
      .update({ status: "active" })
      .eq("id", listingId);
    if (publishError) return { status: "error", message: listingErrorMessage(publishError) };
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
  const listingId = formText(formData, "listingId");
  const status = sellerStatusSchema.safeParse(formText(formData, "status"));
  if (!UUID.test(listingId) || !status.success) return { message: "Action invalide." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { message: SESSION_EXPIRED };

  const { data, error } = await supabase
    .from("listings")
    .update({ status: status.data })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { message: listingErrorMessage(error) };
  if (!data) return { message: "Annonce introuvable." };

  revalidateListing(listingId);
  return {};
}

export async function deleteListingAction(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const listingId = formText(formData, "listingId");
  if (!UUID.test(listingId)) return { message: "Annonce introuvable." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { message: SESSION_EXPIRED };

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
  if (error) return { message: listingErrorMessage(error) };
  if (!data) {
    return {
      message:
        "Cette annonce ne peut pas être supprimée (introuvable ou retirée par la modération).",
    };
  }

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length > 0) await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(paths);

  revalidateListing(listingId);
  redirect(`${routes.profile}?annonce=supprimee` as Route);
}
