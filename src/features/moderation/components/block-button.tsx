"use client";

import { Ban, CircleCheck } from "lucide-react";
import { type RefObject, useActionState, useState } from "react";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { type BlockState, toggleBlockAction } from "../actions";

type BlockButtonProps = {
  userId: string;
  username: string;
  displayName: string;
  initialBlocked: boolean;
  className?: string;
  /** Ouverture de la confirmation pilotée par le parent (menu) : pas de bouton « Bloquer ». */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBlockedChange?: (blocked: boolean) => void;
  /** Élément qui reprend le focus à la fermeture (ouverture depuis un menu). */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** Bloquer (avec confirmation) ou débloquer un utilisateur. */
export function BlockButton({
  userId,
  username,
  displayName,
  initialBlocked,
  className,
  open: controlledOpen,
  onOpenChange,
  onBlockedChange,
  returnFocusRef,
}: BlockButtonProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [state, formAction, pending] = useActionState<BlockState, FormData>(
    async (previous, formData) => {
      const next = await toggleBlockAction(previous, formData);
      if (!next.message) {
        setOpen(false);
        onBlockedChange?.(next.blocked);
      }
      return next;
    },
    { blocked: initialBlocked },
  );

  const fields = (
    <>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="username" value={username} />
    </>
  );

  if (state.blocked) {
    return (
      <form action={formAction} className={cn("flex flex-col gap-1", className)}>
        {fields}
        <SubmitButton pending={pending} variant="outline" size="sm">
          <CircleCheck aria-hidden="true" />
          Débloquer
        </SubmitButton>
        {state.message ? (
          <p className="text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("text-muted-foreground", className)}>
            <Ban aria-hidden="true" />
            Bloquer
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Bloquer {displayName} ?</DialogTitle>
          <DialogDescription>
            Vous ne pourrez plus échanger de messages ni vous suivre mutuellement. Vos abonnements
            réciproques seront supprimés. Cette personne n&apos;en sera pas informée. Vous pourrez
            la débloquer à tout moment depuis vos paramètres.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          {fields}
          {state.message ? (
            <p className="text-sm text-danger" role="alert">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Annuler
              </Button>
            </DialogClose>
            <SubmitButton pending={pending} variant="destructive">
              Bloquer
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
