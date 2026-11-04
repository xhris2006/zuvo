"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { signInHref } from "@/features/auth/links";
import { getCurrentUser } from "@/features/auth/session";
import { isAvailableCity } from "@/features/locations/queries";
import { conversationHref } from "@/features/messaging/links";
import { getT } from "@/i18n/server";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import { fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { translateValidation, vm } from "@/lib/forms/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_IMAGE_BUCKET } from "./image-url";
import { serviceHref } from "./links";
import {
  providerStatusSchema,
  type ServiceField,
  type ServiceImageInput,
  serviceFieldsSchema,
  serviceImagesSchema,
} from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DbError = { code?: string; message?: string; details?: string } | null;

/** Traduit les erreurs de la base liées aux services. */
function serviceErrorMessage(t: ServerDictionary, error: DbError): string {
  const texts = t.serviceActions;
  const message = error?.message ?? "";
  if (error?.code === "PT429") {
    return error.details === "services_per_provider" ? texts.providerLimit : texts.rateLimited;
  }
  if (error?.code === "42501") return texts.forbidden;
  if (error?.code === "P0002" || message.includes("service_not_found")) return texts.notFound;
  if (message.includes("service_banned_word")) return texts.bannedWord;
  if (message.includes("service_image_limit_reached")) return texts.imageLimit;
  if (message.includes("invalid_images")) return texts.invalidPhotos;
  if (error?.code === "23514") return texts.invalidData;
  return texts.generic;
}

function revalidateService(serviceId?: string) {
  if (serviceId) revalidatePath(serviceHref(serviceId));
  revalidatePath(routes.services);
  revalidatePath(routes.servicesSearch);
  revalidatePath(routes.myServices);
}

// -----------------------------------------------------------------------------
// Publication et modification
// -----------------------------------------------------------------------------
export type SaveServiceResult =
  | { status: "saved"; serviceId: string }
  | { status: "error"; message?: string; fieldErrors?: Partial<Record<ServiceField, string>> };

/**
 * Crée ou met à jour un service (les photos sont envoyées ensuite par le
 * navigateur, puis enregistrées par finalizeServiceImagesAction).
 */
export async function saveServiceAction(
  serviceId: string | null,
  formData: FormData,
): Promise<SaveServiceResult> {
  const t = await getT();
  const parsed = serviceFieldsSchema.safeParse({
    title: formText(formData, "title"),
    category: formText(formData, "category"),
    description: formText(formData, "description"),
    city: formText(formData, "city"),
    district: formText(formData, "district"),
    pricingType: formText(formData, "pricingType"),
    price: formText(formData, "price"),
    availability: formText(formData, "availability"),
    availabilityNote: formText(formData, "availabilityNote"),
    extraInfo: formText(formData, "extraInfo"),
    contactPhone: formText(formData, "contactPhone"),
    whatsapp: formText(formData, "whatsapp") === "on",
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom<ServiceField>(parsed.error, t) };
  }
  const fields = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: t.serviceActions.sessionExpired };
  if (serviceId !== null && !UUID.test(serviceId)) {
    return { status: "error", message: t.serviceActions.notFound };
  }

  const { data: category } = await supabase
    .from("service_categories")
    .select("id")
    .eq("slug", fields.category)
    .eq("is_active", true)
    .maybeSingle();
  if (!category) {
    return {
      status: "error",
      fieldErrors: { category: translateValidation(vm("categoryRequired"), t.validation) },
    };
  }
  if (!(await isAvailableCity(fields.city))) {
    return {
      status: "error",
      fieldErrors: { city: translateValidation(vm("cityInvalid"), t.validation) },
    };
  }

  const values = {
    title: fields.title,
    category_id: category.id,
    description: fields.description,
    city: fields.city,
    district: fields.district,
    price: fields.price,
    pricing_type: fields.pricingType,
    availability: fields.availability,
    availability_note: fields.availabilityNote,
    extra_info: fields.extraInfo,
    contact_phone: fields.contactPhone,
    whatsapp: fields.whatsapp,
  };

  if (serviceId === null) {
    const { data, error } = await supabase.from("services").insert(values).select("id").single();
    if (error || !data) return { status: "error", message: serviceErrorMessage(t, error) };
    return { status: "saved", serviceId: data.id };
  }

  const { data, error } = await supabase
    .from("services")
    .update(values)
    .eq("id", serviceId)
    .eq("provider_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: serviceErrorMessage(t, error) };
  if (!data) return { status: "error", message: t.serviceActions.notFound };
  return { status: "saved", serviceId };
}

export type FinalizeServiceResult =
  { status: "ok"; serviceId: string } | { status: "error"; message: string };

/** Enregistre la liste ordonnée des photos du service et supprime les fichiers retirés. */
export async function finalizeServiceImagesAction(input: {
  serviceId: string;
  images: ServiceImageInput[];
}): Promise<FinalizeServiceResult> {
  const t = await getT();
  const images = serviceImagesSchema.safeParse(input.images);
  if (!UUID.test(input.serviceId) || !images.success) {
    return { status: "error", message: t.serviceActions.invalidPhotos };
  }
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: t.serviceActions.sessionExpired };

  const { data: removed, error } = await supabase.rpc("sync_service_images", {
    p_service_id: input.serviceId,
    p_images: images.data,
  });
  if (error) return { status: "error", message: serviceErrorMessage(t, error) };
  // Suppression des fichiers retirés (sans bloquer en cas d'échec).
  if (removed && removed.length > 0) {
    await supabase.storage.from(SERVICE_IMAGE_BUCKET).remove(removed);
  }

  revalidateService(input.serviceId);
  return { status: "ok", serviceId: input.serviceId };
}

// -----------------------------------------------------------------------------
// Statut et suppression
// -----------------------------------------------------------------------------
export type ServiceActionState = { message?: string };

/** Met en pause ou remet en ligne un service de l'utilisateur. */
export async function updateServiceStatusAction(
  _previous: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const t = await getT();
  const serviceId = formText(formData, "serviceId");
  const status = providerStatusSchema.safeParse(formText(formData, "status"));
  if (!UUID.test(serviceId) || !status.success) return { message: t.serviceActions.invalidAction };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { message: t.serviceActions.sessionExpired };

  const { data, error } = await supabase
    .from("services")
    .update({ status: status.data })
    .eq("id", serviceId)
    .eq("provider_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { message: serviceErrorMessage(t, error) };
  if (!data) return { message: t.serviceActions.notFound };

  revalidateService(serviceId);
  return {};
}

/** Supprime définitivement un service de l'utilisateur et ses photos. */
export async function deleteServiceAction(
  _previous: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const t = await getT();
  const serviceId = formText(formData, "serviceId");
  if (!UUID.test(serviceId)) return { message: t.serviceActions.notFound };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { message: t.serviceActions.sessionExpired };

  const { data: images } = await supabase
    .from("service_images")
    .select("storage_path")
    .eq("service_id", serviceId);

  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("provider_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { message: serviceErrorMessage(t, error) };
  if (!data) return { message: t.serviceActions.notFound };

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length > 0) await supabase.storage.from(SERVICE_IMAGE_BUCKET).remove(paths);

  revalidateService(serviceId);
  redirect(`${routes.myServices}?service=supprime` as Route);
}

// -----------------------------------------------------------------------------
// Favoris et contact
// -----------------------------------------------------------------------------
export type ServiceFavoriteState = { favorited: boolean; message?: string };

/** Ajoute ou retire un service des services enregistrés (l'état réel est relu en base). */
export async function toggleServiceFavoriteAction(
  previous: ServiceFavoriteState,
  formData: FormData,
): Promise<ServiceFavoriteState> {
  const t = await getT();
  const serviceId = formText(formData, "serviceId");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { ...previous, message: t.serviceActions.sessionExpired };
  if (!UUID.test(serviceId)) return { ...previous, message: t.serviceActions.notFound };

  const { count } = await supabase
    .from("service_favorites")
    .select("service_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("service_id", serviceId);
  const favorited = (count ?? 0) > 0;

  const { error } = favorited
    ? await supabase
        .from("service_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
    : await supabase.from("service_favorites").insert({ service_id: serviceId });
  if (error) {
    return { favorited, message: serviceErrorMessage(t, error) };
  }
  revalidatePath(routes.profileFavorites);
  return { favorited: !favorited };
}

export type ContactProviderState = { message?: string };

/** Ouvre (ou retrouve) la conversation avec le prestataire au sujet du service. */
export async function contactProviderAction(
  _previous: ContactProviderState,
  formData: FormData,
): Promise<ContactProviderState> {
  const texts = (await getT()).serviceActions;
  const serviceId = formText(formData, "serviceId");
  if (!UUID.test(serviceId)) return { message: texts.notFound };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) redirect(signInHref(serviceHref(serviceId)));

  const { data, error } = await supabase.rpc("get_or_create_service_conversation", {
    p_service_id: serviceId,
  });
  if (error || !data) {
    if (error?.code === "PT429") return { message: texts.contactRateLimited };
    if (error?.code === "23514") return { message: texts.contactSelf };
    if (error?.code === "P0002") return { message: texts.notFound };
    return { message: texts.contactFailed };
  }
  redirect(conversationHref(data));
}
