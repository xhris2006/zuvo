"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { routes } from "@/config/routes";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type SearchFormProps = {
  id: string;
  defaultValue?: string;
  className?: string;
};

export function SearchForm({ id, defaultValue, className }: SearchFormProps) {
  const t = useT();
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
        className="h-11 w-full rounded-full border border-transparent bg-muted pr-4 pl-10 text-base text-foreground transition-colors placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:bg-card focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm"
      />
    </Form>
  );
}
