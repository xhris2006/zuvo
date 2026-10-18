"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { idleFormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { updatePasswordAction } from "../actions";
import { PASSWORD_MIN_LENGTH } from "../schemas";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <Button asChild>
          <Link href={routes.profile}>Aller à mon profil</Link>
        </Button>
      </div>
    );
  }
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="password"
        label="Nouveau mot de passe"
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, avec des lettres et des chiffres.`}
        error={state.fieldErrors?.password}
      >
        {(control) => (
          <PasswordInput {...control} name="password" autoComplete="new-password" required />
        )}
      </Field>
      <Field
        id="confirmPassword"
        label="Confirmer le mot de passe"
        error={state.fieldErrors?.confirmPassword}
      >
        {(control) => (
          <PasswordInput {...control} name="confirmPassword" autoComplete="new-password" required />
        )}
      </Field>
      <SubmitButton pending={pending} className="w-full">
        Enregistrer le mot de passe
      </SubmitButton>
    </form>
  );
}
