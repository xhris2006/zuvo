import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { getT } from "@/i18n/server";

type DocumentPageProps = {
  title: string;
  intro?: ReactNode;
  /** Date ISO de la dernière mise à jour du contenu. */
  updatedAt?: string;
  /** Marque le document comme brouillon juridique à faire valider. */
  draft?: boolean;
  children: ReactNode;
};

export async function DocumentPage({
  title,
  intro,
  updatedAt,
  draft = false,
  children,
}: DocumentPageProps) {
  const t = await getT();
  return (
    <article className="container-page max-w-3xl pt-6 sm:pt-12">
      <header className="flex flex-col gap-3 border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {intro ? <p className="text-base text-muted-foreground sm:text-lg">{intro}</p> : null}
        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            {t.legal.lastUpdated} : <time dateTime={updatedAt}>{t.format.date(updatedAt)}</time>
          </p>
        ) : null}
      </header>
      {draft ? (
        <Alert variant="warning" title={t.legal.draftTitle} className="mt-6">
          {t.legal.draftBody}
        </Alert>
      ) : null}
      <div className="prose-content mt-4">{children}</div>
    </article>
  );
}

/** Mention visible d'un élément à compléter avant la mise en production. */
export async function ToComplete({ children }: { children: ReactNode }) {
  const t = await getT();
  return (
    <mark className="rounded bg-warning-soft px-1 py-0.5 font-medium text-warning">
      [{t.legal.toComplete} : {children}]
    </mark>
  );
}
