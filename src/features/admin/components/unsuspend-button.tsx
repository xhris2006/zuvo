"use client";

import { UserCheck } from "lucide-react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms/form-state";
import { type ModerationField, setUserSuspensionAction } from "../actions";

const idle: FormState<ModerationField> = { status: "idle" };

export function UnsuspendButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(setUserSuspensionAction, idle);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="suspended" value="false" />
      <SubmitButton pending={pending} variant="outline" size="sm">
        <UserCheck aria-hidden="true" />
        Réactiver
      </SubmitButton>
      {state.status === "error" ? (
        <p className="text-xs text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
