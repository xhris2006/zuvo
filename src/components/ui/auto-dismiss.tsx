"use client";

import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Une confirmation se lit vite ; une erreur laisse plus de temps pour comprendre. */
const DELAYS = { success: 5000, error: 10_000 } as const;

const FADE_MS = 300;

/**
 * Retire son contenu après un délai, avec un court fondu (supprimé si
 * l'utilisateur limite les animations). Le survol ou le focus suspend le
 * décompte, qui repart de zéro ensuite : le message reste lisible tant qu'on
 * s'y attarde.
 */
export function AutoDismiss({
  tone = "success",
  className,
  children,
}: {
  tone?: keyof typeof DELAYS;
  className?: string;
  children: ReactNode;
}) {
  const delay = DELAYS[tone];
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || phase === "gone") return;
    const timer =
      phase === "shown"
        ? setTimeout(() => setPhase("leaving"), delay)
        : setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(timer);
  }, [delay, paused, phase]);

  if (phase === "gone") return null;
  return (
    <div
      className={cn(
        "transition-opacity duration-300 motion-reduce:transition-none",
        phase === "leaving" && "opacity-0",
        className,
      )}
      onPointerEnter={() => {
        setPaused(true);
        setPhase("shown");
      }}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => {
        setPaused(true);
        setPhase("shown");
      }}
      onBlur={() => setPaused(false)}
    >
      {children}
    </div>
  );
}
