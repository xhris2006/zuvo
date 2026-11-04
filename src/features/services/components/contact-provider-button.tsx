"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { signInHref } from "@/features/auth/links";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { contactProviderAction } from "../actions";

/** Ouvre la conversation avec le prestataire (connexion demandée aux visiteurs). */
export function ContactProviderButton({
  serviceId,
  signedIn,
  returnTo,
}: {
  serviceId: string;
  signedIn: boolean;
  returnTo: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(contactProviderAction, {});

  if (!signedIn) {
    return (
      <Link href={signInHref(returnTo)} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        <MessageCircle aria-hidden="true" />
        {t.services.contactProvider}
      </Link>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="serviceId" value={serviceId} />
      <SubmitButton pending={pending} size="lg" className="w-full">
        <MessageCircle aria-hidden="true" />
        {t.services.contactProvider}
      </SubmitButton>
      {state.message ? (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
