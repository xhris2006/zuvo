import { LockKeyhole } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { getDictionary } from "@/i18n";

type AuthRequiredProps = {
  /** Chemin vers lequel revenir après la connexion. */
  returnTo: string;
  description?: string;
};

export function signInHref(returnTo?: string): Route {
  if (!returnTo || returnTo === routes.home) return routes.signIn;
  return `${routes.signIn}?next=${encodeURIComponent(returnTo)}` as Route;
}

/** Invitation à se connecter affichée sur les pages réservées aux membres. */
export function AuthRequired({ returnTo, description }: AuthRequiredProps) {
  const t = getDictionary();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-card">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <LockKeyhole className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold">{t.auth.requiredTitle}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{description ?? t.auth.requiredBody}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={signInHref(returnTo)}>{t.common.signIn}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.signUp}>{t.common.signUp}</Link>
        </Button>
      </div>
    </div>
  );
}
