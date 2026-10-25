"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { type DeleteUserField, deleteUserAction } from "../management-actions";

const idle: FormState<DeleteUserField> = { status: "idle" };

/** Suppression définitive d'un compte, confirmée par la saisie de son nom d'utilisateur. */
export function DeleteUserDialog({ userId, username }: { userId: string; username: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(deleteUserAction, idle);
  const id = useId();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 aria-hidden="true" />
          {t.adminUi.deleteUser.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.adminUi.deleteUser.title}</DialogTitle>
          <DialogDescription>{t.adminUi.deleteUser.description(username)}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="userId" value={userId} />
          <FormMessage state={state} />
          <Field
            id={`${id}-reason`}
            label={t.adminUi.reasonForLog}
            error={state.fieldErrors?.reason}
            required
          >
            {(control) => (
              <Textarea
                {...control}
                name="reason"
                rows={3}
                maxLength={500}
                defaultValue={state.values?.reason}
              />
            )}
          </Field>
          <Field
            id={`${id}-confirmation`}
            label={t.adminUi.deleteUser.confirm(username)}
            error={state.fieldErrors?.confirmation}
            required
          >
            {(control) => (
              <Input {...control} name="confirmation" autoComplete="off" spellCheck={false} />
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t.adminUi.cancel}
              </Button>
            </DialogClose>
            <SubmitButton pending={pending} variant="destructive">
              {t.adminUi.deleteUser.submit}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
