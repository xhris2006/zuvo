"use client";

import { Send } from "lucide-react";
import { useActionState, useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { answerSupportRequestAction, type SupportAnswerField } from "../actions";

const idle: FormState<SupportAnswerField> = { status: "idle" };

/** Réponse de l'équipe à une demande d'assistance, avec clôture facultative. */
export function SupportAnswerForm({ requestId }: { requestId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(answerSupportRequestAction, idle);
  const id = useId();
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <FormMessage state={state} />
      <Field
        id={`${id}-response`}
        label={t.adminUi.supportAnswer.response}
        error={state.fieldErrors?.response}
      >
        {(control) => (
          <Textarea
            {...control}
            name="response"
            rows={3}
            maxLength={2000}
            defaultValue={state.values?.response}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="close" />
          {t.adminUi.supportAnswer.close}
        </label>
        <SubmitButton pending={pending} size="sm">
          <Send aria-hidden="true" />
          {t.adminUi.supportAnswer.send}
        </SubmitButton>
      </div>
    </form>
  );
}
