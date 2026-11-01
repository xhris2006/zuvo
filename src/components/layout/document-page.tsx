import type { ReactNode } from "react";
import { getT } from "@/i18n/server";

type DocumentPageProps = {
  title: string;
  intro?: ReactNode;
  /** Date ISO de la dernière mise à jour du contenu. */
  updatedAt?: string;
  children: ReactNode;
};

export async function DocumentPage({ title, intro, updatedAt, children }: DocumentPageProps) {
  const t = await getT();
  return (
    <article className="container-page max-w-3xl pt-6 sm:pt-12">
      <header className="flex flex-col gap-3 border-b border-border pb-6">
        <h1 className="text-xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {intro ? <p className="text-sm text-muted-foreground sm:text-base">{intro}</p> : null}
        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            {t.legal.lastUpdated} : <time dateTime={updatedAt}>{t.format.date(updatedAt)}</time>
          </p>
        ) : null}
      </header>
      <div className="prose-content mt-4">{children}</div>
    </article>
  );
}
