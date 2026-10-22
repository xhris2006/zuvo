"use client";

import { type ReactNode, useActionState, useId, useState } from "react";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms/form-state";
import type { ModerationField } from "../actions";

type ModerationDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  action: (
    previous: FormState<ModerationField>,
    formData: FormData,
  ) => Promise<FormState<ModerationField>>;
  /** Champs cachés (identifiants). */
  fields: Record<string, string>;
  reasonLabel?: string;
  /** Champs supplémentaires affichés avant le motif (ex. cases à cocher). */
  children?: ReactNode;
  /** Bouton de confirmation non destructif (ex. avertissement). */
  confirmVariant?: "destructive" | "primary";
};

const idle: FormState<ModerationField> = { status: "idle" };

/** Action de modération avec motif obligatoire, confirmée dans une fenêtre. */
export function ModerationDialog({
  trigger,
  title,
  description,
  confirmLabel,
  action,
  fields,
  reasonLabel = "Motif (communiqué à l'utilisateur concerné)",
  children,
  confirmVariant = "destructive",
}: ModerationDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, idle);
  const id = useId();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {state.status === "success" ? (
          <div className="flex flex-col gap-4">
            <FormMessage state={state} />
            <DialogFooter>
              <DialogClose asChild>
                <Button>Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4" noValidate>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <FormMessage state={state} />
            {children}
            <Field
              id={`${id}-reason`}
              label={reasonLabel}
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Annuler
                </Button>
              </DialogClose>
              <SubmitButton pending={pending} variant={confirmVariant}>
                {confirmLabel}
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
