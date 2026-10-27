import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { callbackErrorMessage } from "@/features/auth/errors";
import { safeRedirectPath } from "@/features/auth/redirect";
import { getAuthSettings } from "@/features/auth/settings";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.authPages.signInTitle, robots: { index: false } };
}

export default async function SignInPage(props: PageProps<"/connexion">) {
  const t = await getT();
  const searchParams = await props.searchParams;
  const next =
    typeof searchParams.next === "string" ? safeRedirectPath(searchParams.next) : undefined;
  const callbackError = callbackErrorMessage(t.authErrors, searchParams.erreur);

  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title={t.authPages.signInTitle}>
        <AuthUnavailable />
      </AuthCard>
    );
  }

  const settings = await getAuthSettings();
  const signUpLink = (
    <>
      {t.authPages.noAccount}{" "}
      <Link
        href={routes.signUp}
        className="font-semibold text-primary-ink hover:text-primary-ink-hover"
      >
        {t.authPages.createAccount}
      </Link>
    </>
  );

  return (
    <AuthCard
      title={t.authPages.signInTitle}
      description={t.authPages.signInDescription}
      footer={signUpLink}
    >
      {callbackError ? <Alert variant="danger">{callbackError}</Alert> : null}
      <GoogleSignIn settings={settings} next={next} />
      <SignInForm next={next} />
    </AuthCard>
  );
}
