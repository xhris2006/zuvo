"use client";

import { type ComponentProps, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Couche inclinée en perspective qui suit doucement le pointeur (souris ou
 * pavé tactile). Seules des variables CSS changent : aucun rendu React à chaque
 * mouvement. Inclinaison de base réglable avec --tilt-base-x et --tilt-base-y.
 * Sans effet au toucher et si l'utilisateur réduit les animations.
 */
export function TiltLayer({ className, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const query = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!element || !query.matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        element.style.setProperty("--tilt-x", x.toFixed(3));
        element.style.setProperty("--tilt-y", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <div ref={ref} className={cn("tilt-layer", className)} {...props} />;
}
