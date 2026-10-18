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

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="displayName"
        label="Nom affiché"
        hint="Visible sur votre profil, par exemple votre prénom."
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
        label="Nom d'utilisateur"
        hint="3 à 30 caractères : lettres minuscules, chiffres et _."
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
      <Field id="email" label="Adresse e-mail" error={errors.email}>
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
        label="Mot de passe"
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, avec des lettres et des chiffres.`}
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
            J&apos;accepte les{" "}
            <Link
              href={routes.terms}
              className="font-medium text-primary underline"
              target="_blank"
            >
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link
              href={routes.privacy}
              className="font-medium text-primary underline"
              target="_blank"
            >
              politique de confidentialité
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
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
