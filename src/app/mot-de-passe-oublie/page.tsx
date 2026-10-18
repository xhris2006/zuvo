import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Indiquez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href={routes.signIn} className="font-semibold text-primary hover:text-primary-hover">
          Retour à la connexion
        </Link>
      }
    >
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <AuthUnavailable />}
    </AuthCard>
  );
}
