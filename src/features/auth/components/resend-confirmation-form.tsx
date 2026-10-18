"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms/form-state";
import { resendConfirmationAction } from "../actions";

export function ResendConfirmationForm({ email }: { email?: string }) {
  const [state, formAction, pending] = useActionState(resendConfirmationAction, idleFormState);
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-muted p-4">
      <input type="hidden" name="email" value={email ?? ""} />
      <FormMessage state={state} />
      <p className="text-sm text-muted-foreground">Vous n&apos;avez pas reçu l&apos;e-mail ?</p>
      <SubmitButton pending={pending} variant="outline" size="sm">
        Renvoyer l&apos;e-mail de confirmation
      </SubmitButton>
    </form>
  );
}
