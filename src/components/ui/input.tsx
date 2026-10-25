import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const controlClasses =
  "w-full min-w-0 rounded-lg border border-input bg-card px-3 text-control text-foreground transition-colors placeholder:text-muted-foreground/80 hover:border-foreground/40 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/30 sm:text-sm";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(controlClasses, "h-11", className)} {...props} />;
}
