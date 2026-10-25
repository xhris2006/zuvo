"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms/form-state";
import { createSupportRequestAction } from "../actions";
import { MESSAGE_MAX, SUBJECT_MAX, type SupportField } from "../schemas";

const idle: FormState<SupportField> = { status: "idle" };

type SupportFormProps = {
  /** Contestation du retrait de cette annonce ; absent : demande de contact. */
  appeal?: { listingId: string; title: string };
};

/** Formulaire d'assistance : question libre ou contestation d'un retrait d'annonce. */
export function SupportForm({ appeal }: SupportFormProps) {
  const [state, formAction, pending] = useActionState(createSupportRequestAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="kind" value={appeal ? "appeal" : "contact"} />
      {appeal ? <input type="hidden" name="listingId" value={appeal.listingId} /> : null}
      <FormMessage state={state} />
      <Field id={`${id}-subject`} label="Objet" error={state.fieldErrors?.subject} required>
        {(control) => (
          <Input
            {...control}
            name="subject"
            maxLength={SUBJECT_MAX}
            defaultValue={
              state.status === "error"
                ? state.values?.subject
                : appeal
                  ? `Contestation du retrait de « ${appeal.title} »`
                  : undefined
            }
          />
        )}
      </Field>
      <Field
        id={`${id}-message`}
        label={appeal ? "Pourquoi contestez-vous ce retrait ?" : "Votre message"}
        hint="Ne communiquez jamais de mot de passe ni de code reçu par SMS."
        error={state.fieldErrors?.message}
        required
      >
        {(control) => (
          <Textarea
            {...control}
            name="message"
            rows={6}
            maxLength={MESSAGE_MAX}
            defaultValue={state.status === "error" ? state.values?.message : undefined}
          />
        )}
      </Field>
      <SubmitButton pending={pending} className="self-start">
        <Send aria-hidden="true" />
        {appeal ? "Envoyer la contestation" : "Envoyer"}
      </SubmitButton>
    </form>
  );
}
