"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { routes } from "@/config/routes";
import { signInHref } from "@/features/auth/links";
import { getDictionary } from "@/i18n";
import type { FormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { cn } from "@/lib/utils";
import { createReportAction, type ReportField } from "../actions";
import { REPORT_DETAILS_MAX, type ReportTargetType, reasonsByTarget } from "../schemas";

const buttonLabels: Record<ReportTargetType, string> = {
  listing: "Signaler l'annonce",
  user: "Signaler",
  message: "Signaler",
};

const titles: Record<ReportTargetType, string> = {
  listing: "Signaler cette annonce",
  user: "Signaler cet utilisateur",
  message: "Signaler ce message",
};

type ReportDialogProps = {
  targetType: ReportTargetType;
  targetId: string;
  signedIn: boolean;
  returnTo: string;
  /** « icon » : bouton compact (messages). */
  variant?: "button" | "icon";
  className?: string;
};

const idle: FormState<ReportField> = { status: "idle" };

function ReportForm({ targetType, targetId }: Pick<ReportDialogProps, "targetType" | "targetId">) {
  const t = getDictionary();
  const [state, formAction, pending] = useActionState(createReportAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const groupId = useId();
  useFocusFirstError(formRef, state);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <p className="text-sm text-muted-foreground">
          Nous examinons chaque signalement. Si vous vous sentez en danger, bloquez
          l&apos;utilisateur et consultez nos{" "}
          <Link href={routes.safety} className="font-medium underline">
            conseils de sécurité
          </Link>
          .
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Fermer</Button>
          </DialogClose>
        </DialogFooter>
      </div>
    );
  }

  const reasonError = state.fieldErrors?.reason;
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <FormMessage state={state} />
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-legend`}
        aria-describedby={reasonError ? `${groupId}-error` : undefined}
        aria-invalid={reasonError ? true : undefined}
        aria-required
        tabIndex={-1}
        className="flex flex-col gap-2 outline-none"
      >
        <p id={`${groupId}-legend`} className="mb-1 text-sm font-medium">
          Motif
        </p>
        {reasonsByTarget[targetType].map((reason) => (
          <label
            key={reason}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm has-checked:border-primary has-checked:bg-secondary/50"
          >
            <input
              type="radio"
              name="reason"
              value={reason}
              defaultChecked={state.values?.reason === reason}
              className="size-4 accent-primary"
            />
            {t.reports.reasons[reason]}
          </label>
        ))}
        {reasonError ? (
          <p id={`${groupId}-error`} className="text-sm text-danger">
            {reasonError}
          </p>
        ) : null}
      </div>
      <Field
        id={`${groupId}-details`}
        label="Précisions (facultatif)"
        hint="Ne communiquez pas de données personnelles inutiles."
        error={state.fieldErrors?.details}
      >
        {(control) => (
          <Textarea
            {...control}
            name="details"
            rows={3}
            maxLength={REPORT_DETAILS_MAX}
            defaultValue={state.values?.details}
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
          Envoyer le signalement
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** Bouton « Signaler » ouvrant le formulaire de signalement. */
export function ReportDialog({
  targetType,
  targetId,
  signedIn,
  returnTo,
  variant = "button",
  className,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  // Nouveau formulaire à chaque ouverture (après un envoi réussi notamment).
  const [formKey, setFormKey] = useState(0);
  const label = titles[targetType];

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-danger",
          className,
        )}
        aria-label={label}
        title={label}
      >
        <Flag className="size-3.5" aria-hidden="true" />
      </button>
    ) : (
      <Button variant="ghost" size="sm" className={cn("text-muted-foreground", className)}>
        <Flag aria-hidden="true" />
        {buttonLabels[targetType]}
      </Button>
    );

  if (!signedIn) {
    return variant === "icon" ? null : (
      <Link
        href={signInHref(returnTo)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground",
          className,
        )}
      >
        <Flag aria-hidden="true" />
        Signaler
      </Link>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((key) => key + 1);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Votre signalement est confidentiel : la personne concernée ne saura pas qui l&apos;a
            envoyé.
          </DialogDescription>
        </DialogHeader>
        <ReportForm key={formKey} targetType={targetType} targetId={targetId} />
      </DialogContent>
    </Dialog>
  );
}
