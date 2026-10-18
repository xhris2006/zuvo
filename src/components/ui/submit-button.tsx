"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "loading"> & {
  /** Force l'état d'attente (ex. useActionState). */
  pending?: boolean;
};

/** Bouton d'envoi qui se désactive pendant le traitement du formulaire. */
export function SubmitButton({ pending, children, ...props }: SubmitButtonProps) {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={pending ?? status.pending} {...props}>
      {children}
    </Button>
  );
}
