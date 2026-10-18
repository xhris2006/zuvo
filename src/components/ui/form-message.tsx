import type { FormState } from "@/lib/forms/form-state";
import { Alert } from "./alert";

/** Message global d'un formulaire (erreur ou confirmation). */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <Alert variant={state.status === "success" ? "success" : "danger"}>{state.message}</Alert>;
}
