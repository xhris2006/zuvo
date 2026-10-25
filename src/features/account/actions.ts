"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/session";
import { type FormState, formText } from "@/lib/forms/form-state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listUserFiles, removeUserFiles } from "./storage-cleanup";

export type DeleteAccountField = "confirmation";

/**
 * Supprime définitivement le compte connecté : compte d'authentification
 * (profil, annonces, favoris, abonnements… suivent par cascade) puis photos.
 * Exige de saisir son nom d'utilisateur. La clé service_role n'est utilisée
 * qu'ici, côté serveur, et uniquement pour l'utilisateur de la session.
 */
export async function deleteAccountAction(
  _previous: FormState<DeleteAccountField>,
  formData: FormData,
): Promise<FormState<DeleteAccountField>> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return { status: "error", message: "Votre session a expiré. Reconnectez-vous." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const confirmation = formText(formData, "confirmation").trim().replace(/^@/, "").toLowerCase();
  if (!profile || confirmation !== profile.username) {
    return {
      status: "error",
      fieldErrors: { confirmation: "Saisissez exactement votre nom d'utilisateur pour confirmer." },
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      status: "error",
      message:
        "La suppression automatique n'est pas encore activée sur ce service. Contactez-nous depuis la page Aide pour demander la suppression de votre compte.",
    };
  }

  // Les chemins des fichiers sont relevés avant que la base ne les oublie.
  const files = await listUserFiles(admin, user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { status: "error", message: "La suppression a échoué. Veuillez réessayer." };
  }
  if (!(await removeUserFiles(admin, files))) {
    // Aucun identifiant ni chemin dans les journaux.
    console.error("Suppression de compte : certains fichiers n'ont pas pu être supprimés.");
  }

  // Le compte n'existe plus : on efface simplement les cookies de session.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  revalidatePath("/", "layout");
  redirect(`${routes.welcome}?compte=supprime` as Route);
}
