"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useActionState, useOptimistic } from "react";
import { signInHref } from "@/features/auth/links";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "../actions";
import { useT } from "@/i18n/client";

type FavoriteButtonProps = {
  listingId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  /** Page à retrouver après connexion. */
  returnTo: string;
  variant?: "icon" | "button";
  className?: string;
};

export function FavoriteButton({
  listingId,
  initialFavorited,
  signedIn,
  returnTo,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const t = useT();
  const [state, formAction, pending] = useActionState(toggleFavoriteAction, {
    favorited: initialFavorited,
  });
  // Affichage immédiat du nouvel état, confirmé (ou annulé) par la réponse du serveur.
  const [favorited, setOptimisticFavorited] = useOptimistic(state.favorited);
  const label = favorited ? t.listing.favoriteRemove : t.listing.favoriteAdd;
  const iconClass = cn(
    "size-5 transition-colors",
    favorited && "fill-danger text-danger",
    favorited && favorited !== initialFavorited && "animate-heart-pop",
  );
  const iconButtonClass = cn(
    "inline-flex size-9 items-center justify-center rounded-full bg-card/95 text-foreground shadow-card transition-transform hover:scale-105 active:scale-95",
    className,
  );
  const fullButtonClass = cn(
    "inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted",
    className,
  );

  if (!signedIn) {
    return (
      <Link
        href={signInHref(returnTo)}
        className={variant === "icon" ? iconButtonClass : fullButtonClass}
        aria-label={variant === "icon" ? t.listing.signInToFavorite : undefined}
      >
        <Heart className="size-5" aria-hidden="true" />
        {variant === "button" ? t.listing.favorite : null}
      </Link>
    );
  }

  return (
    <form
      action={(formData) => {
        setOptimisticFavorited(!favorited);
        formAction(formData);
      }}
    >
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={favorited}
        aria-label={variant === "icon" ? label : undefined}
        title={label}
        className={variant === "icon" ? iconButtonClass : fullButtonClass}
      >
        <Heart className={iconClass} aria-hidden="true" />
        {variant === "button" ? (favorited ? t.listing.inFavorites : t.listing.favorite) : null}
      </button>
      {state.message ? (
        <span className="sr-only" role="alert">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
