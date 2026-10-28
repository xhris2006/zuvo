"use client";

import { SendHorizontal } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { sendSupportMessageAction } from "../actions";
import { MESSAGE_MAX, type SupportMessageField } from "../schemas";

const idle: FormState<SupportMessageField> = { status: "idle" };

/** Zone de saisie d'une conversation d'assistance (auteur de la demande). */
export function SupportComposer({ requestId }: { requestId: string }) {
  const t = useT();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(sendSupportMessageAction, idle);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  const error = state.fieldErrors?.body;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <FormMessage state={state} />
      <div className="flex items-end gap-2">
        <label htmlFor={`${id}-body`} className="sr-only">
          {t.messaging.yourMessage}
        </label>
        <Textarea
          id={`${id}-body`}
          name="body"
          rows={2}
          maxLength={MESSAGE_MAX}
          required
          placeholder={t.messaging.writeMessage}
          defaultValue={state.status === "error" ? state.values?.body : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="min-h-12 flex-1 resize-none"
          onKeyDown={(event) => {
            // Entrée envoie, Maj + Entrée passe à la ligne (comme la messagerie).
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SubmitButton pending={pending} size="icon" aria-label={t.messaging.send}>
          <SendHorizontal aria-hidden="true" />
        </SubmitButton>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {t.supportForm.hint}
        </p>
      )}
    </form>
  );
}
