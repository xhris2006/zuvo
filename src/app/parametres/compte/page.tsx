import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { requireUser } from "@/features/auth/session";
import { SettingsSubpage } from "@/features/settings/components/settings-subpage";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.rows.account, robots: { index: false } };
}

export default async function AccountSettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.settingsAccount);
  const t = await getT();
  const s = t.settingsPage;

  return (
    <SettingsSubpage title={s.rows.account} description={s.accountDescription}>
      <Card>
        <CardHeader>
          <CardTitle>{s.account}</CardTitle>
          <CardDescription>
            {s.loginEmail} <strong>{user.email ?? s.emailMissing}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton variant="outline" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{s.password}</CardTitle>
          <CardDescription>{s.passwordDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </SettingsSubpage>
  );
}
