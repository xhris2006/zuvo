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
import { useT } from "@/i18n/client";

export function UpdatePasswordForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(updatePasswordAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} persist />
        <Button asChild>
          <Link href={routes.profile}>{t.authForms.goToProfile}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="password"
        label={t.authForms.newPassword}
        hint={t.authForms.passwordHint(PASSWORD_MIN_LENGTH)}
        error={state.fieldErrors?.password}
      >
        {(control) => (
          <PasswordInput {...control} name="password" autoComplete="new-password" required />
        )}
      </Field>
      <Field
        id="confirmPassword"
        label={t.authForms.confirmPassword}
        error={state.fieldErrors?.confirmPassword}
      >
        {(control) => (
          <PasswordInput {...control} name="confirmPassword" autoComplete="new-password" required />
        )}
      </Field>
      <SubmitButton pending={pending} className="w-full">
        {t.authForms.savePassword}
      </SubmitButton>
    </form>
  );
}
