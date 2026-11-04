import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grille de cartes : une colonne sur téléphone, puis 2, 3 ou 4 colonnes. */
export function ServiceGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
