// Module navigateur (localStorage, Notification) : importé uniquement par des composants client.
import { publicEnv } from "@/lib/env";
import { isPushSupported } from "./push-client";

/** Invitation fermée par l'utilisateur (même clé qu'avant le changement de nom). */
export const PUSH_PROMPT_DISMISS_KEY = "zuvo:push-prompt-dismissed";
const CHANGE_EVENT = "push-attention-change";

/**
 * Les notifications méritent d'être signalées sur cet appareil : prises en
 * charge, jamais demandées (ni accordées ni refusées) et invitation non fermée.
 * Aucune requête réseau : simple lecture de l'état du navigateur.
 */
export function pushNeedsAttention(): boolean {
  if (!publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !isPushSupported()) return false;
  if (Notification.permission !== "default") return false;
  try {
    return window.localStorage.getItem(PUSH_PROMPT_DISMISS_KEY) !== "1";
  } catch {
    return true;
  }
}

/** Abonnement pour useSyncExternalStore (autres onglets et changements locaux). */
export function subscribePushAttention(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** À appeler après une activation ou la fermeture de l'invitation. */
export function notifyPushAttentionChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
