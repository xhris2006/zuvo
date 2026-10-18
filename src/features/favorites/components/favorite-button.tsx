"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { signInHref } from "@/features/auth/links";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "../actions";

type FavoriteButtonProps = {
  listingId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  /** Page à retrouver après connexion. */
  returnTo: string;
  variant?: "icon" | "button";
};

export function FavoriteButton({
  listingId,
  initialFavorited,
  signedIn,
  returnTo,
  variant = "icon",
}: FavoriteButtonProps) {
  const [state, formAction, pending] = useActionState(toggleFavoriteAction, {
    favorited: initialFavorited,
  });
  const label = state.favorited ? "Retirer des favoris" : "Ajouter aux favoris";
  const iconClass = cn("size-5", state.favorited && "fill-danger text-danger");
  const iconButtonClass =
    "inline-flex size-9 items-center justify-center rounded-full bg-card/95 text-foreground shadow-card transition-transform hover:scale-105 active:scale-95";
  const fullButtonClass =
    "inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted";

  if (!signedIn) {
    return (
      <Link
        href={signInHref(returnTo)}
        className={variant === "icon" ? iconButtonClass : fullButtonClass}
        aria-label={variant === "icon" ? "Se connecter pour ajouter aux favoris" : undefined}
      >
        <Heart className="size-5" aria-hidden="true" />
        {variant === "button" ? "Favori" : null}
      </Link>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={state.favorited}
        aria-label={variant === "icon" ? label : undefined}
        title={label}
        className={variant === "icon" ? iconButtonClass : fullButtonClass}
      >
        <Heart className={iconClass} aria-hidden="true" />
        {variant === "button" ? (state.favorited ? "Dans vos favoris" : "Favori") : null}
      </button>
      {state.message ? (
        <span className="sr-only" role="alert">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
