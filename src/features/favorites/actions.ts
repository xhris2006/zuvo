"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { formText } from "@/lib/forms/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FavoriteState = { favorited: boolean; message?: string };

/** Ajoute ou retire une annonce des favoris de l'utilisateur connecté. */
export async function toggleFavoriteAction(
  previous: FavoriteState,
  formData: FormData,
): Promise<FavoriteState> {
  const listingId = formText(formData, "listingId");
  if (!UUID.test(listingId)) return { ...previous, message: "Annonce introuvable." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user)
    return { ...previous, message: "Connectez-vous pour ajouter des favoris." };

  const { count } = await supabase
    .from("favorites")
    .select("listing_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("listing_id", listingId);
  const currentlyFavorited = (count ?? 0) > 0;

  const { error } = currentlyFavorited
    ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId)
    : await supabase.from("favorites").insert({ listing_id: listingId });

  if (error && error.code !== "23505") {
    return { favorited: currentlyFavorited, message: "Impossible de modifier vos favoris." };
  }

  revalidatePath(routes.favorites);
  return { favorited: !currentlyFavorited };
}
