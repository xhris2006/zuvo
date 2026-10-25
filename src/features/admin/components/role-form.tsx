"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms/form-state";
import { setRoleAction } from "../management-actions";

const idle: FormState = { status: "idle" };

type RoleFormProps = {
  userId: string;
  role: "admin" | "moderator";
  /** true : attribuer le rôle ; false : le retirer. */
  grant: boolean;
  label: string;
  variant?: "outline" | "destructive";
};

/** Attribue ou retire un rôle (administrateurs uniquement, vérifié par la base). */
export function RoleForm({ userId, role, grant, label, variant = "outline" }: RoleFormProps) {
  const [state, formAction, pending] = useActionState(setRoleAction, idle);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="granted" value={String(grant)} />
      <SubmitButton pending={pending} variant={variant} size="sm" className="self-start">
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
