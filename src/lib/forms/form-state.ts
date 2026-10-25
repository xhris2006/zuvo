import type { z } from "zod";
import type { Dictionary } from "@/i18n";
import { translateValidation } from "./validation";

/** État renvoyé par une action serveur de formulaire (useActionState). */
export type FormState<Field extends string = string> = {
  status: "idle" | "error" | "success";
  /** Message global (erreur ou confirmation), déjà traduit. */
  message?: string;
  /** Code d'erreur métier permettant d'adapter l'interface (ex. renvoi d'e-mail). */
  code?: string;
  fieldErrors?: Partial<Record<Field, string>>;
  /** Valeurs non sensibles à réafficher après une erreur. */
  values?: Partial<Record<Field, string>>;
};

export const idleFormState: FormState = { status: "idle" };

/** Première erreur de chaque champ, traduite, au format attendu par les formulaires. */
export function fieldErrorsFrom<Field extends string>(
  error: z.ZodError,
  t: Pick<Dictionary, "validation">,
): Partial<Record<Field, string>> {
  const result: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key as Field] = translateValidation(issue.message, t.validation);
    }
  }
  return result;
}

/** Lit un champ texte d'un FormData (les fichiers et absences donnent ""). */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
