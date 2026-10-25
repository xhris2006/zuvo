import { LogOut } from "lucide-react";
import type { ComponentProps } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { PushEndpointField } from "@/features/notifications/components/push-endpoint-field";
import { getT } from "@/i18n/server";
import { signOutAction } from "../actions";

export async function SignOutButton(props: Omit<ComponentProps<typeof SubmitButton>, "children">) {
  const t = await getT();
  return (
    <form action={signOutAction}>
      <PushEndpointField />
      <SubmitButton variant="ghost" {...props}>
        <LogOut aria-hidden="true" />
        {t.authForms.signOut}
      </SubmitButton>
    </form>
  );
}
