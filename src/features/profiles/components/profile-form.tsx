"use client";

import { useActionState, useRef } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { cities } from "@/config/locations";
import type { FormState } from "@/lib/forms/form-state";
import { useFocusFirstError } from "@/lib/forms/use-focus-first-error";
import { updateProfileAction } from "../actions";
import type { PublicProfile } from "../queries";
import { BIO_MAX_LENGTH } from "../schemas";
import { AvatarUploader } from "./avatar-uploader";

type ProfileFormProps = {
  profile: PublicProfile;
  avatarUrl: string | null;
};

export function ProfileForm({ profile, avatarUrl }: ProfileFormProps) {
  const initialState: FormState = {
    status: "idle",
    values: {
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio ?? "",
      city: profile.city ?? "",
    },
  };
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const values = state.values ?? initialState.values!;
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <AvatarUploader
        userId={profile.id}
        name={profile.display_name}
        currentUrl={avatarUrl}
        error={errors.avatarPath}
      />
      <Field id="displayName" label="Nom affiché" error={errors.displayName} required>
        {(control) => (
          <Input
            {...control}
            name="displayName"
            maxLength={50}
            defaultValue={values.displayName}
            required
          />
        )}
      </Field>
      <Field
        id="username"
        label="Nom d'utilisateur"
        hint="Il apparaît dans l'adresse de votre profil public."
        error={errors.username}
        required
      >
        {(control) => (
          <Input
            {...control}
            name="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={31}
            defaultValue={values.username}
            required
          />
        )}
      </Field>
      <Field id="city" label="Ville" error={errors.city}>
        {(control) => (
          <Select {...control} name="city" defaultValue={values.city}>
            <option value="">Non précisée</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id="bio"
        label="Biographie"
        hint={`${BIO_MAX_LENGTH} caractères au maximum.`}
        error={errors.bio}
      >
        {(control) => (
          <Textarea
            {...control}
            name="bio"
            rows={4}
            maxLength={BIO_MAX_LENGTH}
            defaultValue={values.bio}
          />
        )}
      </Field>
      <SubmitButton pending={pending} className="self-start">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
