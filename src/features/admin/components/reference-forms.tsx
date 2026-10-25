"use client";

import { Check, Plus } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import type { ReferenceField } from "../schemas";

type ReferenceAction = (
  previous: FormState<ReferenceField>,
  formData: FormData,
) => Promise<FormState<ReferenceField>>;

const idle: FormState<ReferenceField> = { status: "idle" };

/** Ajout d'une catégorie ou d'une ville ; l'identifiant est déduit du nom s'il est vide. */
export function ReferenceCreateForm({
  action,
  withRegion = false,
  submitLabel,
}: {
  action: ReferenceAction;
  withRegion?: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
      noValidate
    >
      <FormMessage state={state} />
      <div className={withRegion ? "grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
        <Field id={`${id}-name`} label={t.adminUi.name} error={state.fieldErrors?.name} required>
          {(control) => (
            <Input
              {...control}
              name="name"
              maxLength={60}
              defaultValue={state.status === "error" ? state.values?.name : undefined}
            />
          )}
        </Field>
        {withRegion ? (
          <Field id={`${id}-region`} label={t.adminUi.region} error={state.fieldErrors?.region}>
            {(control) => (
              <Input
                {...control}
                name="region"
                maxLength={60}
                defaultValue={state.status === "error" ? state.values?.region : undefined}
              />
            )}
          </Field>
        ) : null}
        <Field
          id={`${id}-slug`}
          label={t.adminUi.referenceForms.slug}
          hint={t.adminUi.referenceForms.slugHint}
          error={state.fieldErrors?.slug}
        >
          {(control) => (
            <Input
              {...control}
              name="slug"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              defaultValue={state.status === "error" ? state.values?.slug : undefined}
            />
          )}
        </Field>
      </div>
      <SubmitButton pending={pending} className="self-start">
        <Plus aria-hidden="true" />
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

/** Renommage en ligne (et région pour une ville). */
export function ReferenceEditForm({
  action,
  id,
  name,
  region,
}: {
  action: ReferenceAction;
  id: string;
  name: string;
  /** Région : affichée uniquement pour une ville. */
  region?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  const t = useT();
  const fieldId = useId();
  return (
    <form action={formAction} className="flex min-w-0 flex-1 flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${fieldId}-name`} className="sr-only">
          {t.adminUi.name}
        </label>
        <Input
          id={`${fieldId}-name`}
          name="name"
          defaultValue={name}
          maxLength={60}
          required
          className="h-9 min-w-0 flex-1 basis-40"
          aria-invalid={state.fieldErrors?.name ? true : undefined}
        />
        {region !== undefined ? (
          <>
            <label htmlFor={`${fieldId}-region`} className="sr-only">
              {t.adminUi.region}
            </label>
            <Input
              id={`${fieldId}-region`}
              name="region"
              defaultValue={region}
              maxLength={60}
              placeholder={t.adminUi.region}
              className="h-9 min-w-0 flex-1 basis-32"
            />
          </>
        ) : null}
        <SubmitButton
          pending={pending}
          variant="outline"
          size="sm"
          aria-label={t.adminUi.referenceForms.saveItem(name)}
        >
          <Check aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t.adminUi.save}</span>
        </SubmitButton>
      </div>
      {state.status === "error" ? (
        <p className="text-xs text-danger" role="alert">
          {state.fieldErrors?.name ?? state.message}
        </p>
      ) : state.status === "success" ? (
        <p className="text-xs text-success" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
