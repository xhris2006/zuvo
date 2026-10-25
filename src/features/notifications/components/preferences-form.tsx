"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms/form-state";
import { type PreferenceField, updateNotificationPreferencesAction } from "../actions";
import type { NotificationPreferences } from "../queries";
import { useT } from "@/i18n/client";

const idle: FormState<PreferenceField> = { status: "idle" };

export function PreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  const t = useT();
  const copy = t.preferences;
  const options: Array<{ name: PreferenceField; label: string; hint: string }> = [
    { name: "new_message", label: copy.newMessage, hint: copy.newMessageHint },
    { name: "new_follower", label: copy.newFollower, hint: copy.newFollowerHint },
    { name: "listing_activity", label: copy.listingActivity, hint: copy.listingActivityHint },
    { name: "followed_user_listing", label: copy.followedListing, hint: copy.followedListingHint },
  ];
  const [state, formAction, pending] = useActionState(updateNotificationPreferencesAction, idle);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{copy.legend}</legend>
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
      <p className="text-xs text-muted-foreground">{copy.alwaysRemoval}</p>
      <SubmitButton pending={pending} className="self-start">
        {copy.save}
      </SubmitButton>
    </form>
  );
}
