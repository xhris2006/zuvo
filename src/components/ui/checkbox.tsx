import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Case à cocher native, stylée et accessible. */
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-5 shrink-0 cursor-pointer rounded border border-input accent-primary aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
