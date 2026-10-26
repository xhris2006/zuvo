"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Demande la notification « Installez l'application » pour le membre connecté
 * (créée une seule fois par la base). Vrai si la demande a été traitée.
 */
export async function requestInstallGuideAction(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { error } = await supabase.rpc("request_install_guide");
  return !error;
}
