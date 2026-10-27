"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { idleFormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { signUpAction } from "../actions";
import { PASSWORD_MIN_LENGTH } from "../schemas";
import { useT } from "@/i18n/client";

export function SignUpForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(signUpAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="displayName"
        label={t.authForms.displayName}
        hint={t.authForms.displayNameHint}
        error={errors.displayName}
      >
        {(control) => (
          <Input
            {...control}
            name="displayName"
            autoComplete="name"
            maxLength={50}
            defaultValue={state.values?.displayName}
            required
          />
        )}
      </Field>
      <Field
        id="username"
        label={t.authForms.username}
        hint={t.authForms.usernameHint}
        error={errors.username}
      >
        {(control) => (
          <Input
            {...control}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={31}
            defaultValue={state.values?.username}
            required
          />
        )}
      </Field>
      <Field id="email" label={t.authForms.email} error={errors.email}>
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
      <Field
        id="password"
        label={t.authForms.password}
        hint={t.authForms.passwordHint(PASSWORD_MIN_LENGTH)}
        error={errors.password}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="acceptTerms"
            name="acceptTerms"
            className="mt-0.5"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
            required
          />
          <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
            {t.authForms.acceptPrefix}{" "}
            <Link
              href={routes.terms}
              className="font-medium text-primary-ink underline"
              target="_blank"
            >
              {t.authForms.acceptTerms}
            </Link>{" "}
            {t.authForms.acceptAnd}{" "}
            <Link
              href={routes.privacy}
              className="font-medium text-primary-ink underline"
              target="_blank"
            >
              {t.authForms.acceptPrivacy}
            </Link>
            .
          </label>
        </div>
        {errors.acceptTerms ? (
          <p id="acceptTerms-error" className="text-xs font-medium text-danger" role="alert">
            {errors.acceptTerms}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={pending} className="w-full">
        {t.authForms.createAccount}
      </SubmitButton>
    </form>
  );
}
