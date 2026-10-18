"use client";

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
          <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-muted-foreground">Veuillez réessayer dans un instant.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
