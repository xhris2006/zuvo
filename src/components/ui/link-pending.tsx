"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Retour visuel immédiat pendant le chargement de la page visée par le lien
 * parent : voile avec indicateur (cartes) ou barre animée (navigation).
 */
export function LinkPending({
  variant = "overlay",
  className,
}: {
  variant?: "overlay" | "bar";
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  if (variant === "bar") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 h-0.5 w-8 animate-pulse rounded-full bg-primary",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex animate-in items-center justify-center rounded-xl bg-background/50 duration-150 fade-in-0",
        className,
      )}
    >
      <span className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </span>
  );
}
