"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ReportStatus } from "@/features/moderation/schemas";
import type { FormState } from "@/lib/forms/form-state";
import { updateReportStatusAction } from "../actions";

const idle: FormState = { status: "idle" };

/** Prise en charge, résolution ou classement d'un signalement. */
export function ReportStatusForm({ reportId, status }: { reportId: string; status: ReportStatus }) {
  const [state, formAction, pending] = useActionState(updateReportStatusAction, idle);
  const open = status === "pending" || status === "in_review";
  if (!open) return null;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="reportId" value={reportId} />
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <label htmlFor={`note-${reportId}`} className="sr-only">
        Note de traitement (facultative)
      </label>
      <Input
        id={`note-${reportId}`}
        name="note"
        maxLength={1000}
        placeholder="Note de traitement (facultative)"
        className="h-9 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <SubmitButton
            name="status"
            value="in_review"
            variant="outline"
            size="sm"
            pending={pending}
          >
            Prendre en charge
          </SubmitButton>
        ) : null}
        <SubmitButton name="status" value="resolved" variant="outline" size="sm" pending={pending}>
          Marquer comme traité
        </SubmitButton>
        <SubmitButton name="status" value="dismissed" variant="ghost" size="sm" pending={pending}>
          Classer sans suite
        </SubmitButton>
      </div>
    </form>
  );
}
