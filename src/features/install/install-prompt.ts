/**
 * Invite d'installation native (Chrome, Edge, Samsung Internet) : l'événement
 * beforeinstallprompt n'arrive qu'une fois par chargement de page, souvent
 * avant l'ouverture du guide ; il est donc capté dès l'arrivée sur le site
 * (InstallSupport) et gardé ici. Safari ne le propose pas.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPromptState = "available" | "installed" | "unavailable";

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallPromptState = "unavailable";
const listeners = new Set<() => void>();

function update(next: InstallPromptState) {
  state = next;
  for (const listener of listeners) listener();
}

/** À appeler une fois au chargement ; renvoie la fonction de nettoyage. */
export function captureInstallPrompt(): () => void {
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update("available");
  };
  const onInstalled = () => {
    deferred = null;
    update("installed");
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPromptState(): InstallPromptState {
  return state;
}

/** Ouvre la fenêtre d'installation du navigateur ; vrai si l'utilisateur accepte. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  update("unavailable");
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") update("installed");
  return outcome === "accepted";
}
