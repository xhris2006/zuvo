import { Search } from "lucide-react";
import Form from "next/form";
import { routes } from "@/config/routes";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

/** Recherche rapide de services (en-tête et barre latérale dans l'espace Services). */
export function ServiceQuickSearch({
  id,
  t,
  defaultValue,
  className,
}: {
  id: string;
  t: Dictionary;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <Form action={routes.servicesSearch} role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        {t.services.searchLabel}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t.services.searchPlaceholder}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-transparent bg-muted pr-4 pl-10 text-control text-foreground transition-[color,background-color,border-color,box-shadow] duration-300 placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:bg-card focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm dark:bg-field"
      />
    </Form>
  );
}
