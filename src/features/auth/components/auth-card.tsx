import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Mise en page commune des écrans d'authentification. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="container-page flex justify-center pt-6 sm:pt-14">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-10" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
        {footer ? (
          <div className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
