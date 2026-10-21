"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { toggleFollowAction } from "../actions";

type FollowButtonProps = {
  profileId: string;
  username: string;
  initialFollowing: boolean;
  className?: string;
};

export function FollowButton({
  profileId,
  username,
  initialFollowing,
  className,
}: FollowButtonProps) {
  const [state, formAction, pending] = useActionState(toggleFollowAction, {
    following: initialFollowing,
  });

  return (
    <form action={formAction} className={cn("flex flex-col items-stretch gap-1", className)}>
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
