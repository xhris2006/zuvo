import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { DeleteAccountDialog } from "@/features/account/components/delete-account-dialog";
import { requireUser } from "@/features/auth/session";
import { getCurrentProfile } from "@/features/profiles/queries";
import { SettingsSubpage } from "@/features/settings/components/settings-subpage";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.deleteAccount, robots: { index: false } };
}

export default async function DeleteAccountSettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  await requireUser(routes.settingsDelete);
  const [t, profile] = await Promise.all([getT(), getCurrentProfile()]);
  // Sans profil (incohérence), rien à supprimer depuis cette page.
  if (!profile) redirect(routes.settings);

  return (
    <SettingsSubpage title={t.settingsPage.deleteAccount}>
      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle>{t.settingsPage.deleteAccount}</CardTitle>
          <CardDescription>{t.settingsPage.deleteAccountDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog username={profile.username} />
        </CardContent>
      </Card>
    </SettingsSubpage>
  );
}
