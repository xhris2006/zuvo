"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { useEffect, useState, useSyncExternalStore } from "react";
import { routes } from "@/config/routes";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type SearchFormProps = {
  id: string;
  defaultValue?: string;
  className?: string;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

/**
 * Suggestions tapées puis effacées lettre par lettre dans le champ vide.
 * Renvoie le texte affiché (vide quand l'animation est arrêtée).
 */
function useTypedSuggestions(words: string[], active: boolean): string {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active || words.length === 0) return;
    let word = 0;
    let length = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const current = words[word % words.length] ?? "";
      if (!deleting && length < current.length) {
        length += 1;
        timer = setTimeout(step, 70 + Math.random() * 50);
      } else if (!deleting) {
        deleting = true;
        timer = setTimeout(step, 1700);
      } else if (length > 0) {
        length -= 1;
        timer = setTimeout(step, 32);
      } else {
        deleting = false;
        word += 1;
        timer = setTimeout(step, 450);
      }
      setText(current.slice(0, length));
    };
    timer = setTimeout(step, 1400);
    return () => {
      clearTimeout(timer);
      setText("");
    };
  }, [active, words]);
  return text;
}

export function SearchForm({ id, defaultValue, className }: SearchFormProps) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [empty, setEmpty] = useState(!defaultValue);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => true);
  const animate = empty && !focused && !reduced;
  const typed = useTypedSuggestions(t.nav.searchSuggestions, animate);
  const showTyped = animate && typed.length > 0;

  return (
    <Form action={routes.explore} role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        {t.nav.searchLabel}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t.nav.searchPlaceholder}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => setEmpty(event.target.value === "")}
        className={cn(
          "h-11 w-full rounded-full border border-transparent bg-muted pr-4 pl-10 text-control text-foreground transition-[color,background-color,border-color,box-shadow] duration-300 placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:bg-card focus-visible:shadow-[0_0_0_4px_rgb(255_122_0/0.14),0_8px_24px_-12px_rgb(255_122_0/0.4)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm",
          showTyped && "placeholder:text-transparent",
        )}
      />
      {showTyped ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-10 flex items-center text-control text-muted-foreground sm:text-sm"
        >
          {typed}
          <span className="typing-caret text-primary" />
        </span>
      ) : null}
    </Form>
  );
}
