"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useId, useRef } from "react";
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
import type { FormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { type DeleteAccountField, deleteAccountAction } from "../actions";

const idle: FormState<DeleteAccountField> = { status: "idle" };

export function DeleteAccountDialog({ username }: { username: string }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  useFocusFirstError(formRef, state);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="self-start border-danger/40 text-danger">
          <Trash2 aria-hidden="true" />
          Supprimer mon compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer définitivement votre compte ?</DialogTitle>
          <DialogDescription>
            Votre profil, vos annonces et leurs photos, vos favoris, abonnements et notifications
            seront supprimés. Vos messages restent visibles par vos interlocuteurs, sous le nom «
            Utilisateur supprimé ». Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
          <FormMessage state={state} />
          <Field
            id={`${id}-confirmation`}
            label={
              <>
                Pour confirmer, saisissez votre nom d&apos;utilisateur : <strong>{username}</strong>
              </>
            }
            error={state.fieldErrors?.confirmation}
            required
          >
            {(control) => (
              <Input
                {...control}
                name="confirmation"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Annuler
              </Button>
            </DialogClose>
            <SubmitButton pending={pending} variant="destructive">
              Supprimer définitivement
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
