import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { routes } from "@/config/routes";
import { getT } from "@/i18n/server";

/** Sous-page des paramètres : retour à la liste des réglages, titre et contenu. */
export async function SettingsSubpage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const t = await getT();
  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 pt-3 sm:gap-6 sm:pt-8">
      <div className="flex flex-col gap-1">
        <Link
          href={routes.settings}
          className="-ml-1.5 inline-flex items-center gap-0.5 self-start rounded-md py-1 pr-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4.5" aria-hidden="true" />
          {t.settingsPage.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
