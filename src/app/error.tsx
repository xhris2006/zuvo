"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getDictionary } from "@/i18n";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = getDictionary();

  useEffect(() => {
    // Seul l'identifiant (digest) est utile pour retrouver l'erreur dans les
    // journaux serveur ; le détail n'est jamais affiché à l'utilisateur.
    console.error("Erreur d'affichage", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="container-page max-w-xl pt-12 sm:pt-20">
      <EmptyState
        headingLevel="h1"
        icon={TriangleAlert}
        title={t.errors.genericTitle}
        description={t.errors.genericBody}
        action={<Button onClick={reset}>{t.common.retry}</Button>}
      />
    </div>
  );
}
