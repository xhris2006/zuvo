"use client";

import { usePathname } from "next/navigation";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Défilement minimal (px) avant de masquer ou de réafficher l'en-tête. */
const SCROLL_THRESHOLD = 8;

/**
 * En-tête collant qui se cache quand on fait défiler la page vers le bas et
 * réapparaît dès qu'on remonte (petits écrans uniquement). Il reste visible
 * en haut de page, quand il contient le focus et après chaque navigation.
 */
export function HideOnScrollHeader({ className, children, ...props }: ComponentProps<"header">) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();

  // Nouvelle page : l'en-tête redevient visible.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setHidden(false);
  }

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      lastY = y;
      const header = ref.current;
      const height = header?.offsetHeight ?? 0;
      const focusInside = header?.contains(document.activeElement) ?? false;
      setHidden(delta > 0 && y > height && !focusInside);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      ref={ref}
      {...props}
      data-hidden={hidden ? "" : undefined}
      onFocusCapture={() => setHidden(false)}
      className={cn(
        "transition-transform duration-300 ease-out max-md:data-hidden:-translate-y-full",
        className,
      )}
    >
      {children}
    </header>
  );
}
