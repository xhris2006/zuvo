"use client";

import { useActionState, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {state.status === "success" ? null : (
        <>
          <Field id="email" label="Adresse e-mail" error={state.fieldErrors?.email}>
            {(control) => (
              <Input
                {...control}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                defaultValue={state.values?.email}
                required
              />
            )}
          </Field>
          <SubmitButton pending={pending} className="w-full">
            Envoyer le lien
          </SubmitButton>
        </>
      )}
    </form>
  );
}
