import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  id: string;
  title: string;
  description?: ReactNode;
  /** Lien « Tout voir » (ou autre libellé) affiché à droite du titre. */
  href?: Route;
  linkLabel?: string;
  className?: string;
};

/** Titre de section avec lien d'accès à la liste complète. */
export async function SectionHeader({
  id,
  title,
  description,
  href,
  linkLabel,
  className,
}: SectionHeaderProps) {
  const t = await getT();
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4 sm:mb-4", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          id={id}
          className="reveal-on-scroll-blur text-xl font-bold tracking-tight sm:text-[1.3125rem]"
        >
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-1 text-sm font-semibold text-primary-ink hover:text-primary-ink-hover"
        >
          {linkLabel ?? t.common.seeAll}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
