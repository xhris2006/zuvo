import { LogOut } from "lucide-react";
import type { ComponentProps } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { PushEndpointField } from "@/features/notifications/components/push-endpoint-field";
import { signOutAction } from "../actions";

export function SignOutButton(props: Omit<ComponentProps<typeof SubmitButton>, "children">) {
  return (
    <form action={signOutAction}>
      <PushEndpointField />
      <SubmitButton variant="ghost" {...props}>
        <LogOut aria-hidden="true" />
        Se déconnecter
      </SubmitButton>
    </form>
  );
}
