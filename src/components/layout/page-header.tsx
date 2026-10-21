import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Actions compactes gardées à droite du titre, y compris sur mobile. */
  inlineActions?: boolean;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  inlineActions = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex gap-4",
        inlineActions
          ? "items-center justify-between"
          : "flex-col sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}
