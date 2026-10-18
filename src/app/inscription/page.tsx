import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { routes } from "@/config/routes";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Créer un compte",
  robots: { index: false },
};

export default function SignUpPage() {
  const t = getDictionary();
  return (
    <div className="container-page flex justify-center pt-8 sm:pt-16">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-10" />
          <h1 className="text-2xl font-bold tracking-tight">{t.auth.signUpTitle}</h1>
        </div>
        <AuthUnavailable />
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href={routes.signIn}
            className="font-semibold text-primary hover:text-primary-hover"
          >
            {t.common.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
