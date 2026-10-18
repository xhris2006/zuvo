"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { updatePrivateContactAction } from "../actions";

export function PrivateContactForm({ phone }: { phone: string | null }) {
  const initialState: FormState = { status: "idle", values: { phone: phone ?? "" } };
  const [state, formAction, pending] = useActionState(updatePrivateContactAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Votre numéro reste privé : il n&apos;est jamais affiché sur votre profil ni sur vos
        annonces. Vous seul décidez de le communiquer à un acheteur.
      </p>
      <FormMessage state={state} />
      <Field
        id="phone"
        label="Téléphone (facultatif)"
        hint="Exemple : 6 90 00 00 00"
        error={state.fieldErrors?.phone}
      >
        {(control) => (
          <Input
            key={state.values?.phone}
            {...control}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            defaultValue={state.values?.phone}
          />
        )}
      </Field>
      <SubmitButton pending={pending} variant="outline" className="self-start">
        Enregistrer le numéro
      </SubmitButton>
    </form>
  );
}
