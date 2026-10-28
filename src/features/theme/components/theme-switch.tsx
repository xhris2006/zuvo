"use client";

import { Moon } from "lucide-react";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { applyTheme, type Theme } from "../theme";

/**
 * Interrupteur « Mode sombre » : applique le thème immédiatement et le
 * mémorise sur cet appareil (cookie lu par le serveur au prochain affichage).
 */
export function ThemeSwitch({ initial }: { initial: Theme }) {
  const t = useT();
  const id = useId();
  const [theme, setTheme] = useState<Theme>(initial);
  const dark = theme === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Moon className="size-[1.125rem]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span id={`${id}-label`} className="text-sm font-medium">
            {t.appearance.darkMode}
          </span>
          <span id={`${id}-hint`} className="text-xs text-muted-foreground">
            {t.appearance.darkModeHint}
          </span>
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
          dark ? "bg-primary" : "bg-input/50",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-6 rounded-full bg-white shadow-card transition-transform duration-200",
            dark ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
