import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

export function Textarea({ className, rows = 5, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea rows={rows} className={cn(controlClasses, "min-h-24 py-2.5", className)} {...props} />
  );
}
