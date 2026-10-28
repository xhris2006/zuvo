import {
  Bell,
  FileText,
  Headset,
  Heart,
  KeyRound,
  LifeBuoy,
  Lock,
  Palette,
  PencilLine,
  Rss,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserX,
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsGroup, SettingsRow } from "@/components/ui/settings-list";
import { routes } from "@/config/routes";
import { isCurrentUserStaff } from "@/features/admin/queries";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/features/auth/session";
import { getBlockedUsers } from "@/features/moderation/queries";
import { getCurrentProfile } from "@/features/profiles/queries";
import { parseTheme, THEME_COOKIE } from "@/features/theme/theme";
import { localeNames } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.title, robots: { index: false } };
}

/**
 * Paramètres et activité : réglages classés par groupes (compte, affichage,
 * confidentialité, activités, assistance, administration), chaque ligne
 * menant à sa sous-page ou à la page concernée.
 */
export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.settings);
  const [t, locale, store, blockedUsers, profile, isStaff] = await Promise.all([
    getT(),
    getLocale(),
    cookies(),
    getBlockedUsers(user.id),
    getCurrentProfile(),
    isCurrentUserStaff(),
  ]);
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);
  const s = t.settingsPage;

  return (
    <div className="container-page flex max-w-2xl flex-col gap-5 pt-3 pb-4 sm:gap-6 sm:pt-8">
      <PageHeader title={s.title} />

      {isStaff ? (
        <SettingsGroup title={s.groups.admin}>
          <SettingsRow href={routes.admin} icon={ShieldCheck} label={s.rows.admin} tone="brand" />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={s.groups.account}>
        <SettingsRow href={routes.editProfile} icon={PencilLine} label={s.rows.editProfile} />
        <SettingsRow
          href={routes.settingsAccount}
          icon={KeyRound}
          label={s.rows.account}
          value={user.email ?? undefined}
        />
        <SettingsRow href={routes.settingsNotifications} icon={Bell} label={s.notifications} />
      </SettingsGroup>

      <SettingsGroup title={s.groups.display}>
        <SettingsRow
          href={routes.settingsDisplay}
          icon={Palette}
          label={s.rows.display}
          value={`${localeNames[locale]} · ${theme === "dark" ? s.rows.themeDark : s.rows.themeLight}`}
        />
      </SettingsGroup>

      <SettingsGroup title={s.groups.privacy}>
        <SettingsRow
          href={routes.settingsPrivacy}
          icon={UserX}
          label={s.rows.privacy}
          value={blockedUsers.length > 0 ? s.rows.blockedCount(blockedUsers.length) : undefined}
        />
      </SettingsGroup>

      <SettingsGroup title={s.groups.activity}>
        <SettingsRow href={routes.profileFavorites} icon={Heart} label={s.rows.favorites} />
        <SettingsRow href={routes.feed} icon={Rss} label={s.rows.feed} />
      </SettingsGroup>

      <SettingsGroup title={s.groups.support}>
        <SettingsRow href={routes.support} icon={Headset} label={s.rows.supportChat} />
        <SettingsRow href={routes.help} icon={LifeBuoy} label={s.rows.help} />
        <SettingsRow href={routes.safety} icon={ShieldCheck} label={s.rows.safety} />
        <SettingsRow href={routes.install} icon={Smartphone} label={s.rows.install} />
        <SettingsRow href={routes.terms} icon={FileText} label={s.rows.terms} />
        <SettingsRow href={routes.privacy} icon={Lock} label={s.rows.privacyPolicy} />
      </SettingsGroup>

      <div className="flex flex-col gap-3">
        {profile ? (
          <SettingsGroup>
            <SettingsRow
              href={routes.settingsDelete}
              icon={Trash2}
              label={s.deleteAccount}
              tone="danger"
            />
          </SettingsGroup>
        ) : null}
        <SignOutButton variant="soft" className="w-full" />
      </div>
    </div>
  );
}
