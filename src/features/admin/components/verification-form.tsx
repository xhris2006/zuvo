"use client";

import { BadgeCheck, BadgeX } from "lucide-react";
import { useActionState, useId } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { setSellerVerificationAction } from "../management-actions";

const idle: FormState<"note"> = { status: "idle" };

/** Attribution ou retrait du badge « vendeur vérifié » (administrateurs). */
export function VerificationForm({ userId, verified }: { userId: string; verified: boolean }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(setSellerVerificationAction, idle);
  const id = useId();
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="verified" value={String(!verified)} />
      <FormMessage state={state} />
      {verified ? null : (
        <>
          <label htmlFor={`${id}-note`} className="text-sm font-medium">
            {t.adminUi.verification.note}
          </label>
          <Input
            id={`${id}-note`}
            name="note"
            maxLength={500}
            placeholder={t.adminUi.verification.placeholder}
          />
        </>
      )}
      <SubmitButton
        pending={pending}
        variant={verified ? "outline" : "primary"}
        size="sm"
        className="self-start"
      >
        {verified ? <BadgeX aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
        {verified ? t.adminUi.verification.revoke : t.adminUi.verification.grant}
      </SubmitButton>
    </form>
  );
}
