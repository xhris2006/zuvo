import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

/**
 * Liste déroulante native : accessible par défaut et adaptée aux sélecteurs
 * des téléphones, contrairement aux listes personnalisées.
 */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(controlClasses, "h-11 cursor-pointer appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
