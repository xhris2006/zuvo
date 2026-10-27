"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { type RefObject, useActionState, useId, useRef, useState } from "react";
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
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { cn } from "@/lib/utils";
import { createReportAction, type ReportField } from "../actions";
import { REPORT_DETAILS_MAX, type ReportTargetType, reasonsByTarget } from "../schemas";

const buttonLabels = {
  listing: "reportListingButton",
  user: "report",
  message: "report",
} as const satisfies Record<ReportTargetType, string>;

const titles = {
  listing: "reportListing",
  user: "reportUser",
  message: "reportMessage",
} as const satisfies Record<ReportTargetType, string>;

type ReportDialogProps = {
  targetType: ReportTargetType;
  targetId: string;
  signedIn: boolean;
  returnTo: string;
  /** « icon » : bouton compact (messages) ; « none » : ouverture pilotée par le parent (menu). */
  variant?: "button" | "icon" | "none";
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Élément qui reprend le focus à la fermeture (ouverture depuis un menu). */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const idle: FormState<ReportField> = { status: "idle" };

function ReportForm({ targetType, targetId }: Pick<ReportDialogProps, "targetType" | "targetId">) {
  const t = useT();
  const [state, formAction, pending] = useActionState(createReportAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const groupId = useId();
  useFocusFirstError(formRef, state);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <p className="text-sm text-muted-foreground">
          {t.moderation.reportedBody}{" "}
          <Link href={routes.safety} className="font-medium underline">
            {t.moderation.safetyTips}
          </Link>
          .
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{t.moderation.close}</Button>
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
          {t.moderation.reason}
        </p>
        {reasonsByTarget[targetType].map((reason) => (
          <label
            key={reason}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm has-checked:border-primary-line has-checked:bg-secondary/50"
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
        label={t.moderation.details}
        hint={t.moderation.detailsHint}
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
            {t.moderation.cancel}
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} variant="destructive">
          {t.moderation.sendReport}
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
  open: controlledOpen,
  onOpenChange,
  returnFocusRef,
}: ReportDialogProps) {
  const t = useT();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  // Nouveau formulaire à chaque ouverture (après un envoi réussi notamment).
  const [formKey, setFormKey] = useState(0);
  const label = t.moderation[titles[targetType]];

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
        {t.moderation[buttonLabels[targetType]]}
      </Button>
    );

  if (!signedIn) {
    return variant !== "button" ? null : (
      <Link
        href={signInHref(returnTo)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground",
          className,
        )}
      >
        <Flag aria-hidden="true" />
        {t.moderation.report}
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
      {variant === "none" ? null : <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{t.moderation.confidential}</DialogDescription>
        </DialogHeader>
        <ReportForm key={formKey} targetType={targetType} targetId={targetId} />
      </DialogContent>
    </Dialog>
  );
}
