import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { isCurrentUserAdmin } from "@/features/admin/queries";
import { requireUser } from "@/features/auth/session";
import { PreferencesForm } from "@/features/notifications/components/preferences-form";
import { PushSettings } from "@/features/notifications/components/push-settings";
import { getLastPushResult, getNotificationPreferences } from "@/features/notifications/queries";
import { SettingsSubpage } from "@/features/settings/components/settings-subpage";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.notifications, robots: { index: false } };
}

export default async function NotificationSettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  await requireUser(routes.settingsNotifications);
  const [t, preferences, lastPush, isAdmin] = await Promise.all([
    getT(),
    getNotificationPreferences(),
    getLastPushResult().catch(() => null),
    isCurrentUserAdmin(),
  ]);
  const s = t.settingsPage;

  return (
    <SettingsSubpage title={s.notifications}>
      <Card>
        <CardHeader>
          <CardTitle>{s.push}</CardTitle>
          <CardDescription>{s.pushDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <PushSettings lastPush={lastPush} isAdmin={isAdmin} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{s.notifications}</CardTitle>
          <CardDescription>{s.notificationsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm preferences={preferences} />
        </CardContent>
      </Card>
    </SettingsSubpage>
  );
}
