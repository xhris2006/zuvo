"use client";

import { useState } from "react";
import type { FormState } from "@/lib/forms/form-state";
import { Alert } from "./alert";
import { AutoDismiss } from "./auto-dismiss";

/**
 * Message global d'un formulaire (erreur ou confirmation). Il s'efface seul
 * après quelques secondes, sauf `persist` : à garder quand le message est tout
 * ce qui reste à l'écran (lien envoyé, signalement transmis…).
 */
export function FormMessage({ state, persist = false }: { state: FormState; persist?: boolean }) {
  // Chaque nouvel envoi renvoie un nouvel état : le message réapparaît, même identique.
  const [shown, setShown] = useState({ state, round: 0 });
  if (shown.state !== state) setShown({ state, round: shown.round + 1 });

  if (!state.message) return null;
  const success = state.status === "success";
  const alert = <Alert variant={success ? "success" : "danger"}>{state.message}</Alert>;
  if (persist) return alert;
  return (
    <AutoDismiss key={shown.round} tone={success ? "success" : "error"}>
      {alert}
    </AutoDismiss>
  );
}
