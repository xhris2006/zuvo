"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  /** Page ouverte si l'historique ne permet pas de revenir en arrière (lien ouvert directement). */
  fallbackHref: Route;
  label?: string;
  className?: string;
};

/** Pastille ronde « Retour » : page précédente, sinon page de repli. */
export function BackButton({ fallbackHref, label, className }: BackButtonProps) {
  const router = useRouter();
  const t = getDictionary();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      aria-label={label ?? t.common.back}
      title={label ?? t.common.back}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-card backdrop-blur transition-transform hover:scale-105 active:scale-95",
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
    </button>
  );
}
