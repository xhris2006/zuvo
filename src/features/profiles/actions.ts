"use server";

import { revalidatePath } from "next/cache";
import { publicProfileHref, routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { schedulePushDispatch } from "@/features/notifications/push/schedule";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOwnAvatarPath, privateContactSchema, profileSchema } from "./schemas";

const SESSION_EXPIRED = "Votre session a expiré. Reconnectez-vous.";
const GENERIC_ERROR = "L'enregistrement a échoué. Veuillez réessayer.";

// -----------------------------------------------------------------------------
// Profil public
// -----------------------------------------------------------------------------
type ProfileField = "username" | "displayName" | "bio" | "city" | "avatarPath";

export async function updateProfileAction(
  _previous: FormState<ProfileField>,
  formData: FormData,
): Promise<FormState<ProfileField>> {
  const values = {
    username: formText(formData, "username"),
    displayName: formText(formData, "displayName"),
    bio: formText(formData, "bio"),
    city: formText(formData, "city"),
  };
  const parsed = profileSchema.safeParse({
    ...values,
    avatarPath: formText(formData, "avatarPath"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: SESSION_EXPIRED, values };

  const { username, displayName, bio, city, avatarPath } = parsed.data;
  const removeAvatar = avatarPath === "-";
  if (avatarPath && !removeAvatar && !isOwnAvatarPath(user.id, avatarPath)) {
    return { status: "error", fieldErrors: { avatarPath: "Photo de profil invalide." }, values };
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("username, avatar_path")
    .eq("id", user.id)
    .single();

  const update: {
    username: string;
    display_name: string;
    bio: string | null;
    city: string | null;
    avatar_path?: string | null;
  } = { username, display_name: displayName, bio, city };
  if (removeAvatar) update.avatar_path = null;
  else if (avatarPath) update.avatar_path = avatarPath;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        fieldErrors: { username: "Ce nom d'utilisateur est déjà pris." },
        values,
      };
    }
    return { status: "error", message: GENERIC_ERROR, values };
  }

  // Supprime l'ancienne photo devenue inutile (sans bloquer en cas d'échec).
  const previousAvatar = current?.avatar_path;
  if (previousAvatar && "avatar_path" in update && update.avatar_path !== previousAvatar) {
    await supabase.storage.from("avatars").remove([previousAvatar]);
  }

  revalidatePath("/", "layout");
  if (current?.username && current.username !== username) {
    revalidatePath(publicProfileHref(current.username));
  }
  return { status: "success", message: "Votre profil a été mis à jour.", values };
}

// -----------------------------------------------------------------------------
// Coordonnées privées
// -----------------------------------------------------------------------------
export async function updatePrivateContactAction(
  _previous: FormState<"phone">,
  formData: FormData,
): Promise<FormState<"phone">> {
  const values = { phone: formText(formData, "phone") };
  const parsed = privateContactSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: SESSION_EXPIRED, values };

  const { error } = await supabase
    .from("profile_private")
    .update({ phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) return { status: "error", message: GENERIC_ERROR, values };

  revalidatePath(routes.editProfile);
  return {
    status: "success",
    message: parsed.data.phone ? "Numéro enregistré." : "Numéro supprimé.",
    values: { phone: parsed.data.phone ?? "" },
  };
}

// -----------------------------------------------------------------------------
// Abonnements
// -----------------------------------------------------------------------------
export type FollowState = { following: boolean; message?: string };

export async function toggleFollowAction(
  previous: FollowState,
  formData: FormData,
): Promise<FollowState> {
  const profileId = formText(formData, "profileId");
  const username = formText(formData, "username");

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { ...previous, message: SESSION_EXPIRED };
  if (!profileId || profileId === user.id) return previous;

  const { count } = await supabase
    .from("follows")
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", user.id)
    .eq("following_id", profileId);
  const currentlyFollowing = (count ?? 0) > 0;

  const { error } = currentlyFollowing
    ? await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileId)
    : await supabase.from("follows").insert({ following_id: profileId });

  if (error) {
    return {
      following: currentlyFollowing,
      message:
        error.code === "PT429"
          ? "Trop d'abonnements en peu de temps. Réessayez plus tard."
          : "Impossible de suivre ce profil.",
    };
  }

  if (username) revalidatePath(publicProfileHref(username));
  revalidatePath(routes.profile);
  if (!currentlyFollowing) schedulePushDispatch({ type: "new_follower", actorId: user.id });
  return { following: !currentlyFollowing };
}
