import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.authPages.forgotTitle, robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <AuthCard
      title={t.authPages.forgotTitle}
      description={t.authPages.forgotDescription}
      footer={
        <Link
          href={routes.signIn}
          className="font-semibold text-primary-ink hover:text-primary-ink-hover"
        >
          {t.authPages.backToSignIn}
        </Link>
      }
    >
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <AuthUnavailable />}
    </AuthCard>
  );
}
