import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getAuthSettings } from "@/features/auth/settings";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez gratuitement votre compte pour vendre et acheter entre particuliers.",
};

export default async function SignUpPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title="Créer un compte">
        <AuthUnavailable />
      </AuthCard>
    );
  }

  const settings = await getAuthSettings();
  const signInLink = (
    <>
      Déjà inscrit ?{" "}
      <Link href={routes.signIn} className="font-semibold text-primary hover:text-primary-hover">
        Se connecter
      </Link>
    </>
  );

  return (
    <AuthCard
      title="Créer un compte"
      description="Gratuit, sans commission, en moins d'une minute."
      footer={signInLink}
    >
      {settings && !settings.signupEnabled ? (
        <Alert variant="warning">Les inscriptions sont momentanément fermées.</Alert>
      ) : (
        <>
          <GoogleSignIn settings={settings} />
          <SignUpForm />
        </>
      )}
    </AuthCard>
  );
}
