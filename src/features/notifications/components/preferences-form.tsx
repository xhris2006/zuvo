"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms/form-state";
import { type PreferenceField, updateNotificationPreferencesAction } from "../actions";
import type { NotificationPreferences } from "../queries";

const options: Array<{ name: PreferenceField; label: string; hint: string }> = [
  {
    name: "new_message",
    label: "Nouveaux messages",
    hint: "Quand un acheteur ou un vendeur vous écrit.",
  },
  {
    name: "new_follower",
    label: "Nouveaux abonnés",
    hint: "Quand quelqu'un suit votre profil.",
  },
  {
    name: "listing_activity",
    label: "Activité de mes annonces",
    hint: "Quand une de vos annonces est ajoutée aux favoris.",
  },
  {
    name: "followed_user_listing",
    label: "Nouvelles annonces des profils suivis",
    hint: "Quand un vendeur que vous suivez publie une annonce.",
  },
];

const idle: FormState<PreferenceField> = { status: "idle" };

export function PreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  const [state, formAction, pending] = useActionState(updateNotificationPreferencesAction, idle);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Me prévenir pour</legend>
        {options.map((option) => (
          <label key={option.name} className="flex cursor-pointer items-start gap-3">
            <Checkbox
              name={option.name}
              defaultChecked={preferences[option.name]}
              className="mt-0.5"
              aria-describedby={`${option.name}-hint`}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{option.label}</span>
              <span id={`${option.name}-hint`} className="text-sm text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Les retraits d&apos;annonce par la modération vous sont toujours signalés.
      </p>
      <SubmitButton pending={pending} className="self-start">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
