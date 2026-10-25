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
import { ThemeSwitch } from "@/features/theme/components/theme-switch";
import { parseTheme, THEME_COOKIE } from "@/features/theme/theme";
import { getDictionary } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Paramètres",
  robots: { index: false },
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.settings);
  const t = getDictionary();
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
      <PageHeader title="Paramètres" />
      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
          <CardDescription>
            Adresse e-mail de connexion : <strong>{user.email ?? "non renseignée"}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton variant="outline" />
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
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choisissez les événements qui apparaissent dans vos notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm preferences={preferences} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notifications push</CardTitle>
          <CardDescription>
            Alertes sur votre téléphone ou votre ordinateur, même quand le site est fermé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushSettings lastPush={lastPush} isAdmin={isAdmin} />
        </CardContent>
      </Card>
      <Card id="blocages">
        <CardHeader>
          <CardTitle>Utilisateurs bloqués</CardTitle>
          <CardDescription>
            Ils ne peuvent plus vous écrire ni vous suivre, et vous ne voyez plus leurs
            notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlockedList users={blockedUsers} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Pour votre sécurité, une reconnexion récente peut être demandée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
      {profile ? (
        <Card id="suppression" className="border-danger/30">
          <CardHeader>
            <CardTitle>Supprimer mon compte</CardTitle>
            <CardDescription>
              Suppression définitive de votre compte et de vos annonces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog username={profile.username} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
