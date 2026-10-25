"use client";

import { Plus, Save } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { addBannedWordAction, saveAntiSpamSettingsAction } from "../management-actions";
import type { AntiSpamField } from "../schemas";

const idle: FormState<AntiSpamField> = { status: "idle" };

/** Limite de publications des comptes récents. */
export function AntiSpamSettingsForm({
  newAccountDays,
  newAccountDailyListings,
}: {
  newAccountDays: number;
  newAccountDailyListings: number;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(saveAntiSpamSettingsAction, idle);
  const id = useId();
  const value = (field: AntiSpamField, fallback: number) =>
    state.status === "error" ? (state.values?.[field] ?? String(fallback)) : String(fallback);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${id}-days`}
          label={t.adminUi.antiSpam.days}
          hint={t.adminUi.antiSpam.daysHint}
          error={state.fieldErrors?.newAccountDays}
        >
          {(control) => (
            <Input
              {...control}
              name="newAccountDays"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              defaultValue={value("newAccountDays", newAccountDays)}
            />
          )}
        </Field>
        <Field
          id={`${id}-listings`}
          label={t.adminUi.antiSpam.listings}
          hint={t.adminUi.antiSpam.listingsHint}
          error={state.fieldErrors?.newAccountDailyListings}
        >
          {(control) => (
            <Input
              {...control}
              name="newAccountDailyListings"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              defaultValue={value("newAccountDailyListings", newAccountDailyListings)}
            />
          )}
        </Field>
      </div>
      <SubmitButton pending={pending} className="self-start">
        <Save aria-hidden="true" />
        {t.adminUi.save}
      </SubmitButton>
    </form>
  );
}

/** Ajout d'un mot interdit (normalisé côté serveur : minuscules, sans accents). */
export function BannedWordForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(addBannedWordAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-end gap-2">
        <Field
          id={`${id}-word`}
          label={t.adminUi.antiSpam.word}
          error={state.fieldErrors?.word}
          className="min-w-0 flex-1 basis-56"
        >
          {(control) => (
            <Input
              {...control}
              name="word"
              maxLength={60}
              autoComplete="off"
              defaultValue={state.status === "error" ? state.values?.word : undefined}
            />
          )}
        </Field>
        <SubmitButton pending={pending}>
          <Plus aria-hidden="true" />
          {t.adminUi.add}
        </SubmitButton>
      </div>
    </form>
  );
}
