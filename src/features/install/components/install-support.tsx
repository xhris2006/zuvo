"use client";

import { useEffect } from "react";
import { requestInstallGuideAction } from "../actions";
import { captureInstallPrompt } from "../install-prompt";
import { detectPlatform, isStandalone } from "../platform";

/** Mémorise, sur l'appareil, que la notification a déjà été demandée. */
const REQUESTED_KEY = "zuvo-install-guide";

/**
 * Capte l'invite d'installation du navigateur et, après la connexion sur un
 * téléphone où l'application n'est pas installée, demande une fois la
 * notification qui mène au guide d'installation.
 */
export function InstallSupport({ signedIn }: { signedIn: boolean }) {
  useEffect(() => captureInstallPrompt(), []);

  useEffect(() => {
    if (!signedIn || isStandalone() || detectPlatform() === "desktop") return;
    try {
      if (window.localStorage.getItem(REQUESTED_KEY)) return;
    } catch {
      return;
    }
    requestInstallGuideAction()
      .then((done) => {
        if (done) window.localStorage.setItem(REQUESTED_KEY, "1");
      })
      .catch(() => undefined);
  }, [signedIn]);

  return null;
}
