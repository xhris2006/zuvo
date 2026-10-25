"use client";

import { useActionState, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { forgotPasswordAction } from "../actions";
import { useT } from "@/i18n/client";

export function ForgotPasswordForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(forgotPasswordAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {state.status === "success" ? null : (
        <>
          <Field id="email" label={t.authForms.email} error={state.fieldErrors?.email}>
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
            {t.authForms.sendLink}
          </SubmitButton>
        </>
      )}
    </form>
  );
}
