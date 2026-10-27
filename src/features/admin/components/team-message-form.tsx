"use client";

import { Send, User, Users } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/forms/form-state";
import { cn } from "@/lib/utils";
import { sendTeamMessageAction, type TeamMessageField } from "../actions";

const idle: FormState<TeamMessageField> = { status: "idle" };

/**
 * Message de l'équipe, reçu en notification : à un membre (nom d'utilisateur)
 * ou, pour les administrateurs, à tous les membres.
 */
export function TeamMessageForm({ canBroadcast }: { canBroadcast: boolean }) {
  const t = useT();
  const copy = t.adminUi.teamMessage;
  const [state, formAction, pending] = useActionState(sendTeamMessageAction, idle);
  const [recipients, setRecipients] = useState<"one" | "all">("one");
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
      {canBroadcast ? (
        <fieldset className="flex flex-col">
          <legend className="mb-2 text-sm font-medium">{copy.recipients}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["one", "all"] as const).map((value) => {
              const Icon = value === "one" ? User : Users;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                    value === recipients
                      ? "border-primary-line bg-accent text-accent-foreground ring-1 ring-primary-line"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="recipients"
                    value={value}
                    checked={value === recipients}
                    onChange={() => setRecipients(value)}
                    className="sr-only"
                  />
                  <Icon className="size-4" aria-hidden="true" />
                  {value === "one" ? copy.oneMember : copy.allMembers}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="recipients" value="one" />
      )}
      {recipients === "one" ? (
        <Field
          id={`${id}-username`}
          label={copy.username}
          error={state.fieldErrors?.username}
          required
        >
          {(control) => (
            <Input
              {...control}
              name="username"
              placeholder={copy.usernamePlaceholder}
              maxLength={31}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state.status === "error" ? state.values?.username : undefined}
            />
          )}
        </Field>
      ) : null}
      <Field
        id={`${id}-message`}
        label={copy.message}
        hint={copy.messageHint}
        error={state.fieldErrors?.message}
        required
      >
        {(control) => (
          <Textarea
            {...control}
            name="message"
            rows={4}
            maxLength={500}
            defaultValue={state.status === "error" ? state.values?.message : undefined}
          />
        )}
      </Field>
      <SubmitButton pending={pending} className="self-start">
        <Send aria-hidden="true" />
        {recipients === "all" ? copy.sendAll : copy.send}
      </SubmitButton>
    </form>
  );
}
