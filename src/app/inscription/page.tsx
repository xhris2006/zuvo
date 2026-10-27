import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getAuthSettings } from "@/features/auth/settings";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.authPages.signUpTitle, description: t.authPages.signUpMetaDescription };
}

export default async function SignUpPage() {
  const t = await getT();
  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title={t.authPages.signUpTitle}>
        <AuthUnavailable />
      </AuthCard>
    );
  }

  const settings = await getAuthSettings();
  const signInLink = (
    <>
      {t.authPages.alreadyMember}{" "}
      <Link
        href={routes.signIn}
        className="font-semibold text-primary-ink hover:text-primary-ink-hover"
      >
        {t.authPages.signIn}
      </Link>
    </>
  );

  return (
    <AuthCard
      title={t.authPages.signUpTitle}
      description={t.authPages.signUpDescription}
      footer={signInLink}
    >
      {settings && !settings.signupEnabled ? (
        <Alert variant="warning">{t.authPages.signupClosed}</Alert>
      ) : (
        <>
          <GoogleSignIn settings={settings} />
          <SignUpForm />
        </>
      )}
    </AuthCard>
  );
}
