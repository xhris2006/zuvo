"use client";

import { BadgeCheck, LayoutGrid, Search } from "lucide-react";
import type { Route } from "next";
import Form from "next/form";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { exploreHref, publicProfileHref, routes, searchSuggestionsEndpoint } from "@/config/routes";
import { toSearchParams } from "@/features/search/schema";
import { foldText, inlineCompletion } from "@/features/search/suggestion-text";
import type { SearchSuggestions } from "@/features/search/suggestions";
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

const MIN_QUERY = 2;
/** Réponses déjà reçues pendant la visite : retaper un mot ne refait pas d'appel. */
const suggestionCache = new Map<string, SearchSuggestions>();

/**
 * Suggestions du serveur pour la saisie, après une courte pause de frappe.
 * Seule la réponse correspondant à la saisie actuelle est renvoyée.
 */
function useSearchSuggestions(value: string, enabled: boolean): SearchSuggestions | null {
  const key = foldText(value).trim().replace(/\s+/g, " ");
  const [result, setResult] = useState<{ key: string; data: SearchSuggestions } | null>(null);

  useEffect(() => {
    if (!enabled || key.length < MIN_QUERY) return;
    const cached = suggestionCache.get(key);
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        if (cached) {
          setResult({ key, data: cached });
          return;
        }
        try {
          const response = await fetch(
            `${searchSuggestionsEndpoint}?${new URLSearchParams({ q: key })}`,
            { signal: controller.signal, headers: { accept: "application/json" } },
          );
          if (!response.ok) return;
          const data = (await response.json()) as SearchSuggestions;
          suggestionCache.set(key, data);
          setResult({ key, data });
        } catch {
          // Hors ligne ou saisie modifiée entre-temps : la recherche classique reste disponible.
        }
      },
      cached ? 0 : 160,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, key]);

  return enabled && result?.key === key ? result.data : null;
}

type Option = {
  id: string;
  kind: "query" | "category" | "member";
  label: string;
  href: Route;
  detail?: string;
  avatarUrl?: string | null;
  verified?: boolean;
};

export function SearchForm({ id, defaultValue, className }: SearchFormProps) {
  const t = useT();
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => true);
  const animate = value === "" && !focused && !reduced;
  const typed = useTypedSuggestions(t.nav.searchSuggestions, animate);
  const showTyped = animate && typed.length > 0;

  const suggestions = useSearchSuggestions(value, focused);
  const options = useMemo<Option[]>(() => {
    if (!suggestions) return [];
    return [
      ...suggestions.queries.map((title, index) => ({
        id: `${listId}-q${index}`,
        kind: "query" as const,
        label: title,
        href: exploreHref(toSearchParams({ q: title })),
      })),
      ...suggestions.categories.map((category) => ({
        id: `${listId}-c-${category.slug}`,
        kind: "category" as const,
        label: category.name,
        href: exploreHref(toSearchParams({ category: category.slug })),
      })),
      ...suggestions.members.map((member) => ({
        id: `${listId}-m-${member.username}`,
        kind: "member" as const,
        label: member.displayName,
        detail: `@${member.username}`,
        href: publicProfileHref(member.username),
        avatarUrl: member.avatarUrl,
        verified: member.verified,
      })),
    ];
  }, [listId, suggestions]);

  const expanded = open && focused && options.length > 0;
  const activeOption = expanded && active >= 0 ? options[active] : undefined;
  // Suite grisée : seulement curseur en fin de saisie et aucune ligne choisie au clavier.
  const completion =
    focused && caretAtEnd && !activeOption && value.length <= 48
      ? inlineCompletion(value, suggestions?.queries ?? [])
      : "";

  function change(next: string) {
    setValue(next);
    setOpen(true);
    setActive(-1);
  }

  function go(option: Option) {
    setOpen(false);
    setActive(-1);
    if (option.kind === "query") setValue(option.label);
    inputRef.current?.blur();
    router.push(option.href);
  }

  function acceptCompletion() {
    change(value + completion);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      // Après la dernière ligne (ou avant la première), retour au texte saisi.
      setActive((current) => {
        const next = current + step;
        if (next >= options.length) return -1;
        if (next < -1) return options.length - 1;
        return next;
      });
    } else if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      go(activeOption);
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if ((event.key === "ArrowRight" || event.key === "End") && completion) {
      event.preventDefault();
      acceptCompletion();
    }
  }

  function trackCaret() {
    const input = inputRef.current;
    if (input) setCaretAtEnd(input.selectionStart === input.value.length);
  }

  return (
    <Form
      action={routes.explore}
      role="search"
      className={cn("relative w-full", className)}
      onSubmit={() => {
        setOpen(false);
        inputRef.current?.blur();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {t.nav.searchLabel}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        value={value}
        placeholder={t.nav.searchPlaceholder}
        maxLength={100}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        role="combobox"
        aria-autocomplete="both"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={activeOption?.id}
        aria-describedby={completion ? `${id}-hint` : undefined}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          setActive(-1);
        }}
        onChange={(event) => {
          change(event.target.value);
          setCaretAtEnd(event.target.selectionStart === event.target.value.length);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={trackCaret}
        onClick={trackCaret}
        className={cn(
          "h-11 w-full rounded-full border border-transparent bg-muted pr-4 pl-10 text-control text-foreground transition-[color,background-color,border-color,box-shadow] duration-300 placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:bg-card focus-visible:shadow-[0_0_0_4px_rgb(255_122_0/0.14),0_8px_24px_-12px_rgb(255_122_0/0.4)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm dark:bg-field",
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
      {completion ? (
        <>
          {/* Le texte saisi, invisible, cale la suite grisée juste après lui. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 left-10 flex items-center overflow-hidden text-control whitespace-pre sm:text-sm"
          >
            <span className="invisible">{value}</span>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={acceptCompletion}
              className="pointer-events-auto truncate text-muted-foreground"
            >
              {completion}
            </button>
          </span>
          <span id={`${id}-hint`} className="sr-only">
            {`${value}${completion}. ${t.nav.suggestions.acceptHint}`}
          </span>
        </>
      ) : null}

      <div
        id={listId}
        role="listbox"
        aria-label={t.nav.suggestions.label}
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(28rem,70dvh)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card py-1.5 text-foreground shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)]"
      >
        {(["query", "category", "member"] as const).map((kind) => {
          const group = options.filter((option) => option.kind === kind);
          if (group.length === 0) return null;
          const title =
            kind === "query"
              ? t.nav.suggestions.searches
              : kind === "category"
                ? t.nav.suggestions.categories
                : t.nav.suggestions.members;
          return (
            <div key={kind} role="group" aria-label={title}>
              <p
                aria-hidden="true"
                className="px-4 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {title}
              </p>
              {group.map((option) => {
                const selected = option === activeOption;
                return (
                  <div
                    key={option.id}
                    id={option.id}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => go(option)}
                    onMouseMove={() => setActive(options.indexOf(option))}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-1.5 text-sm",
                      selected && "bg-muted",
                    )}
                  >
                    {option.kind === "member" ? (
                      <Avatar name={option.label} src={option.avatarUrl ?? null} size="sm" />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {option.kind === "query" ? (
                          <Search className="size-4" aria-hidden="true" />
                        ) : (
                          <LayoutGrid className="size-4" aria-hidden="true" />
                        )}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="truncate">{option.label}</span>
                        {option.verified ? (
                          <BadgeCheck
                            className="size-4 shrink-0 text-primary-ink"
                            aria-label={t.profile.verified}
                          />
                        ) : null}
                      </span>
                      {option.detail ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {option.detail}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {expanded ? t.nav.suggestions.count(options.length) : ""}
      </p>
    </Form>
  );
}
