"use client";

import { History } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { clearViewHistoryAction } from "../actions";

const idle: FormState = { status: "idle" };

export function ClearHistoryForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(clearViewHistoryAction, idle);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="outline" className="self-start">
        <History aria-hidden="true" />
        {t.recommendations.clearHistory}
      </SubmitButton>
    </form>
  );
}
