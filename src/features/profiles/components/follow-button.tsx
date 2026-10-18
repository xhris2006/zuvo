"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { toggleFollowAction } from "../actions";

type FollowButtonProps = {
  profileId: string;
  username: string;
  initialFollowing: boolean;
};

export function FollowButton({ profileId, username, initialFollowing }: FollowButtonProps) {
  const [state, formAction, pending] = useActionState(toggleFollowAction, {
    following: initialFollowing,
  });

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="username" value={username} />
      <SubmitButton
        pending={pending}
        variant={state.following ? "outline" : "primary"}
        aria-pressed={state.following}
      >
        {state.following ? <UserCheck aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
        {state.following ? "Abonné" : "Suivre"}
      </SubmitButton>
      {state.message ? (
        <p className="text-xs text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
