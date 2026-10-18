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
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

export default async function SignInPage(props: PageProps<"/connexion">) {
  const searchParams = await props.searchParams;
  const next =
    typeof searchParams.next === "string" ? safeRedirectPath(searchParams.next) : undefined;
  const callbackError = callbackErrorMessage(searchParams.erreur);

  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title="Connexion">
        <AuthUnavailable />
      </AuthCard>
    );
  }

  const settings = await getAuthSettings();
  const signUpLink = (
    <>
      Pas encore de compte ?{" "}
      <Link href={routes.signUp} className="font-semibold text-primary hover:text-primary-hover">
        Créer un compte
      </Link>
    </>
  );

  return (
    <AuthCard title="Connexion" description="Heureux de vous revoir." footer={signUpLink}>
      {callbackError ? <Alert variant="danger">{callbackError}</Alert> : null}
      <GoogleSignIn settings={settings} next={next} />
      <SignInForm next={next} />
    </AuthCard>
  );
}
