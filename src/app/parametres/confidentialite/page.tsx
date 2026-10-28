import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { BlockedList } from "@/features/moderation/components/blocked-list";
import { getBlockedUsers } from "@/features/moderation/queries";
import { ClearHistoryForm } from "@/features/recommendations/components/clear-history-form";
import { SettingsSubpage } from "@/features/settings/components/settings-subpage";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.rows.privacy, robots: { index: false } };
}

export default async function PrivacySettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.settingsPrivacy);
  const [t, blockedUsers] = await Promise.all([getT(), getBlockedUsers(user.id)]);
  const s = t.settingsPage;

  return (
    <SettingsSubpage title={s.rows.privacy} description={s.privacyDescription}>
      <Card>
        <CardHeader>
          <CardTitle>{s.blocked}</CardTitle>
          <CardDescription>{s.blockedDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <BlockedList users={blockedUsers} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{s.recommendations}</CardTitle>
          <CardDescription>{s.recommendationsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClearHistoryForm />
        </CardContent>
      </Card>
    </SettingsSubpage>
  );
}
