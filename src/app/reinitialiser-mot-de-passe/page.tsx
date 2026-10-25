import type { Metadata } from "next";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthUnavailable } from "@/features/auth/components/auth-unavailable";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { requireUser } from "@/features/auth/session";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.authPages.resetTitle, robots: { index: false } };
}

export default async function ResetPasswordPage() {
  const t = await getT();
  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title={t.authPages.resetTitle}>
        <AuthUnavailable />
      </AuthCard>
    );
  }
  await requireUser(routes.resetPassword);
  return (
    <AuthCard title={t.authPages.resetTitle} description={t.authPages.resetDescription}>
      <UpdatePasswordForm />
    </AuthCard>
  );
}
