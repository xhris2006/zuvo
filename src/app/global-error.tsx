"use client";

import { getDictionary } from "@/i18n";

const fr = getDictionary("fr");
const en = getDictionary("en");

import "./globals.css";

/** Dernier recours si la mise en page racine elle-même échoue. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">{fr.errors.genericTitle}</h1>
          <p lang="en" className="text-sm font-medium text-muted-foreground">
            {en.errors.genericTitle}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {fr.errors.globalBody} <span lang="en">{en.errors.globalBody}</span>
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {fr.common.retry} · <span lang="en">{en.common.retry}</span>
          </button>
        </div>
      </body>
    </html>
  );
}
