import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { DeleteAccountDialog } from "@/features/account/components/delete-account-dialog";
import { requireUser } from "@/features/auth/session";
import { BlockedList } from "@/features/moderation/components/blocked-list";
import { getBlockedUsers } from "@/features/moderation/queries";
import { PreferencesForm } from "@/features/notifications/components/preferences-form";
import { PushSettings } from "@/features/notifications/components/push-settings";
import { getLastPushResult, getNotificationPreferences } from "@/features/notifications/queries";
import { isCurrentUserAdmin } from "@/features/admin/queries";
import { getCurrentProfile } from "@/features/profiles/queries";
import { ClearHistoryForm } from "@/features/recommendations/components/clear-history-form";
import { ThemeSwitch } from "@/features/theme/components/theme-switch";
import { parseTheme, THEME_COOKIE } from "@/features/theme/theme";
import { LanguageSwitch } from "@/features/language/components/language-switch";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.title, robots: { index: false } };
}

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.settings);
  const t = await getT();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const [preferences, blockedUsers, profile, lastPush, isAdmin] = await Promise.all([
    getNotificationPreferences(),
    getBlockedUsers(user.id),
    getCurrentProfile(),
    getLastPushResult().catch(() => null),
    isCurrentUserAdmin(),
  ]);

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader title={t.settingsPage.title} />
      <Card>
        <CardHeader>
          <CardTitle>{t.settingsPage.account}</CardTitle>
          <CardDescription>
            {t.settingsPage.loginEmail} <strong>{user.email ?? t.settingsPage.emailMissing}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton variant="outline" />
        </CardContent>
      </Card>
      <Card id="langue">
        <CardHeader>
          <CardTitle>{t.language.title}</CardTitle>
          <CardDescription>{t.language.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitch />
        </CardContent>
      </Card>
      <Card id="apparence">
        <CardHeader>
          <CardTitle>{t.appearance.title}</CardTitle>
          <CardDescription>{t.appearance.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitch initial={theme} />
        </CardContent>
      </Card>
      <Card id="notifications">
        <CardHeader>
          <CardTitle>{t.settingsPage.notifications}</CardTitle>
          <CardDescription>{t.settingsPage.notificationsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm preferences={preferences} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settingsPage.push}</CardTitle>
          <CardDescription>{t.settingsPage.pushDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <PushSettings lastPush={lastPush} isAdmin={isAdmin} />
        </CardContent>
      </Card>
      <Card id="recommandations">
        <CardHeader>
          <CardTitle>{t.settingsPage.recommendations}</CardTitle>
          <CardDescription>{t.settingsPage.recommendationsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClearHistoryForm />
        </CardContent>
      </Card>
      <Card id="blocages">
        <CardHeader>
          <CardTitle>{t.settingsPage.blocked}</CardTitle>
          <CardDescription>{t.settingsPage.blockedDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <BlockedList users={blockedUsers} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settingsPage.password}</CardTitle>
          <CardDescription>{t.settingsPage.passwordDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
      {profile ? (
        <Card id="suppression" className="border-danger/30">
          <CardHeader>
            <CardTitle>{t.settingsPage.deleteAccount}</CardTitle>
            <CardDescription>{t.settingsPage.deleteAccountDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog username={profile.username} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
