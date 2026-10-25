"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { signInHref } from "@/features/auth/links";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startConversationAction } from "../actions";
import { useT } from "@/i18n/client";

type ContactSellerButtonProps = {
  listingId: string;
  signedIn: boolean;
  returnTo: string;
};

export function ContactSellerButton({ listingId, signedIn, returnTo }: ContactSellerButtonProps) {
  const t = useT();
  const [state, formAction, pending] = useActionState(startConversationAction, {});

  if (!signedIn) {
    return (
      <Link href={signInHref(returnTo)} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        <MessageCircle aria-hidden="true" />
        {t.messaging.contactSeller}
      </Link>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      <SubmitButton pending={pending} size="lg" className="w-full">
        <MessageCircle aria-hidden="true" />
        {t.messaging.contactSeller}
      </SubmitButton>
      {state.message ? (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
