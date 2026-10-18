import type { Metadata } from "next";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { requireUser } from "@/features/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false },
};

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title="Nouveau mot de passe">
        <AuthUnavailable />
      </AuthCard>
    );
  }
  await requireUser(routes.resetPassword);
  return (
    <AuthCard title="Nouveau mot de passe" description="Choisissez votre nouveau mot de passe.">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
