"use client";

import { type RefObject, useEffect } from "react";
import type { FormState } from "./form-state";

/**
 * Après un envoi refusé, place le focus sur le premier champ invalide pour
 * que les utilisateurs de clavier et de lecteur d'écran trouvent l'erreur.
 */
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    invalid?.focus();
  }, [formRef, state]);
}
