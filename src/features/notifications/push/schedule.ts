import "server-only";
import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dispatchPendingPush, type PushFilter } from "./dispatch";
import { getPushConfig } from "./send";

/**
 * Envoie en push, après la réponse (sans ralentir l'action), les
 * notifications créées par l'action en cours. Sans configuration push
 * (clés VAPID, clé service_role), ne fait rien : les notifications restent
 * visibles dans l'application.
 */
export function schedulePushDispatch(filter: PushFilter) {
  after(async () => {
    const config = getPushConfig();
    const admin = createSupabaseAdminClient();
    if (!config || !admin) return;
    try {
      await dispatchPendingPush(admin, filter, config);
    } catch {
      // Aucun détail (identifiants, adresses) dans les journaux.
      console.error("Notifications push : l'envoi a échoué.");
    }
  });
}
