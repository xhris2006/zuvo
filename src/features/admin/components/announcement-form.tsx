"use client";

import { Megaphone } from "lucide-react";
import { useActionState, useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms/form-state";
import { saveAnnouncementAction } from "../management-actions";
import type { AnnouncementField } from "../schemas";

const idle: FormState<AnnouncementField> = { status: "idle" };

export type AnnouncementDefaults = {
  id?: string;
  kind: string;
  message: string;
  linkUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

/** Publication ou modification du message global (dates à l'heure du Cameroun). */
export function AnnouncementForm({ defaults }: { defaults: AnnouncementDefaults }) {
  const [state, formAction, pending] = useActionState(saveAnnouncementAction, idle);
  const id = useId();
  const value = (field: AnnouncementField) =>
    state.status === "error" ? (state.values?.[field] ?? defaults[field]) : defaults[field];

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
      noValidate
    >
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <FormMessage state={state} />
      <Field id={`${id}-kind`} label="Type" error={state.fieldErrors?.kind}>
        {(control) => (
          <Select {...control} name="kind" defaultValue={value("kind")}>
            <option value="info">Information (le visiteur peut la masquer)</option>
            <option value="maintenance">Maintenance (toujours affichée)</option>
          </Select>
        )}
      </Field>
      <Field id={`${id}-message`} label="Message" error={state.fieldErrors?.message} required>
        {(control) => (
          <Textarea
            {...control}
            name="message"
            rows={3}
            maxLength={300}
            defaultValue={value("message")}
          />
        )}
      </Field>
      <Field
        id={`${id}-link`}
        label="Lien (facultatif)"
        hint="Une page du site (ex. /aide) ou une adresse commençant par https://."
        error={state.fieldErrors?.linkUrl}
      >
        {(control) => (
          <Input {...control} name="linkUrl" maxLength={300} defaultValue={value("linkUrl")} />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${id}-starts`}
          label="Début (facultatif)"
          hint="Heure du Cameroun. Vide : immédiatement."
          error={state.fieldErrors?.startsAt}
        >
          {(control) => (
            <Input
              {...control}
              name="startsAt"
              type="datetime-local"
              defaultValue={value("startsAt")}
            />
          )}
        </Field>
        <Field
          id={`${id}-ends`}
          label="Fin (facultatif)"
          hint="Vide : jusqu'à désactivation."
          error={state.fieldErrors?.endsAt}
        >
          {(control) => (
            <Input
              {...control}
              name="endsAt"
              type="datetime-local"
              defaultValue={value("endsAt")}
            />
          )}
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-medium">
        <Checkbox name="isActive" defaultChecked={defaults.isActive} />
        Activé
      </label>
      <SubmitButton pending={pending} className="self-start">
        <Megaphone aria-hidden="true" />
        {defaults.id ? "Enregistrer les modifications" : "Publier le message"}
      </SubmitButton>
    </form>
  );
}
