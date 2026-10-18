"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { idleFormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { signInAction } from "../actions";
import { ResendConfirmationForm } from "./resend-confirmation-form";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <FormMessage state={state} />
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
        <Field id="password" label="Mot de passe" error={state.fieldErrors?.password}>
          {(control) => (
            <PasswordInput {...control} name="password" autoComplete="current-password" required />
          )}
        </Field>
        <div className="-mt-1 text-right">
          <Link
            href={routes.forgotPassword}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <SubmitButton pending={pending} className="w-full">
          Se connecter
        </SubmitButton>
      </form>
      {state.code === "email_not_confirmed" ? (
        <ResendConfirmationForm email={state.values?.email} />
      ) : null}
    </div>
  );
}
