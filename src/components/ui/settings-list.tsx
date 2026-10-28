import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Groupe de réglages : petit titre gris, puis lignes séparées par de fins traits. */
export function SettingsGroup({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      {title ? (
        <h2 className="px-1 pb-1.5 text-[0.8125rem] font-semibold text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </ul>
    </section>
  );
}

/** Ligne de réglage : icône, libellé, valeur actuelle éventuelle et chevron. */
export function SettingsRow({
  href,
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  /** Valeur actuelle (thème, langue…), affichée en gris avant le chevron. */
  value?: string;
  tone?: "default" | "brand" | "danger";
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex min-h-13 items-center gap-3.5 px-4 py-2.5 transition-colors hover:bg-muted",
          tone === "danger" && "text-danger",
          tone === "brand" && "font-semibold text-primary-ink",
        )}
      >
        <Icon className="size-[1.375rem] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        {/* Le libellé reste sur une ligne ; c'est la valeur qui se raccourcit. */}
        <span className="shrink-0 text-[0.9375rem]">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-[0.8125rem] text-muted-foreground">
          {value}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}
