import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-info/20 bg-info-soft text-info",
      success: "border-success/20 bg-success-soft text-success",
      warning: "border-warning/25 bg-warning-soft text-warning",
      danger: "border-danger/20 bg-danger-soft text-danger",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
} as const;

type AlertProps = Omit<ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    title?: ReactNode;
  };

export function Alert({ className, variant, title, children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "info"];
  const isUrgent = variant === "danger";
  return (
    <div
      role={isUrgent ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-foreground/80">{children}</div> : null}
      </div>
    </div>
  );
}
