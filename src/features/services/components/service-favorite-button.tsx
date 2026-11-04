"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useActionState, useOptimistic } from "react";
import { signInHref } from "@/features/auth/links";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { toggleServiceFavoriteAction } from "../actions";

type ServiceFavoriteButtonProps = {
  serviceId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  /** Page à retrouver après connexion. */
  returnTo: string;
  variant?: "icon" | "button";
  className?: string;
};

/** Enregistre un service (cœur), avec affichage immédiat confirmé par le serveur. */
export function ServiceFavoriteButton({
  serviceId,
  initialFavorited,
  signedIn,
  returnTo,
  variant = "icon",
  className,
}: ServiceFavoriteButtonProps) {
  const t = useT();
  const [state, formAction, pending] = useActionState(toggleServiceFavoriteAction, {
    favorited: initialFavorited,
  });
  const [favorited, setOptimisticFavorited] = useOptimistic(state.favorited);
  const label = favorited ? t.services.favoriteRemove : t.services.favoriteAdd;
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
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted",
    className,
  );

  if (!signedIn) {
    return (
      <Link
        href={signInHref(returnTo)}
        className={variant === "icon" ? iconButtonClass : fullButtonClass}
        aria-label={variant === "icon" ? t.services.signInToFavorite : undefined}
      >
        <Heart className="size-5" aria-hidden="true" />
        {variant === "button" ? t.services.save : null}
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
      <input type="hidden" name="serviceId" value={serviceId} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={favorited}
        aria-label={variant === "icon" ? label : undefined}
        title={label}
        className={variant === "icon" ? iconButtonClass : fullButtonClass}
      >
        <Heart className={iconClass} aria-hidden="true" />
        {variant === "button" ? (favorited ? t.services.saved : t.services.save) : null}
      </button>
      {state.message ? (
        <p className="sr-only" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
