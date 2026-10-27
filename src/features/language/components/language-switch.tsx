"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale, localeNames, locales } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Mémorise la langue sur l'appareil puis recharge les données de la page. */
function useChooseLocale() {
  const router = useRouter();
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  function choose(next: Locale) {
    if (next === current) return;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secure}`;
    document.documentElement.lang = next;
    startTransition(() => router.refresh());
  }
  return { current, pending, choose };
}

/** Choix de la langue (Paramètres) : boutons radio Français / English. */
export function LanguageSwitch() {
  const t = useT();
  const { current, pending, choose } = useChooseLocale();
  return (
    <fieldset className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <legend className="sr-only">{t.language.label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {locales.map((locale) => (
          <label
            key={locale}
            lang={locale}
            className={cn(
              "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
              locale === current
                ? "border-primary-line bg-accent text-accent-foreground ring-1 ring-primary-line"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name="locale"
              value={locale}
              checked={locale === current}
              onChange={() => choose(locale)}
              className="sr-only"
            />
            <span aria-hidden="true" className="text-xs font-bold text-muted-foreground uppercase">
              {locale}
            </span>
            {localeNames[locale]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Bascule compacte FR / EN (bienvenue, connexion, inscription). */
export function LanguageToggle({
  className,
  compact = false,
}: {
  className?: string;
  /** Sans l'icône sur les petits écrans (en-têtes chargés). */
  compact?: boolean;
}) {
  const t = useT();
  const { current, pending, choose } = useChooseLocale();
  return (
    <div
      role="group"
      aria-label={t.language.label}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-0.5 text-xs font-bold shadow-card backdrop-blur",
        className,
      )}
    >
      <Languages
        className={cn("mx-1.5 size-3.5 text-muted-foreground", compact && "max-sm:hidden")}
        aria-hidden="true"
      />
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          onClick={() => choose(locale)}
          className={cn(
            "h-7 min-w-9 rounded-full px-2 uppercase transition-colors",
            locale === current
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {locale}
          {/* Nom complet pour les lecteurs d'écran ; le code visible reste dans le nom. */}
          <span className="sr-only"> {localeNames[locale]}</span>
        </button>
      ))}
    </div>
  );
}
