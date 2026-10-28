import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { LanguageSwitch } from "@/features/language/components/language-switch";
import { SettingsSubpage } from "@/features/settings/components/settings-subpage";
import { ThemeSwitch } from "@/features/theme/components/theme-switch";
import { parseTheme, THEME_COOKIE } from "@/features/theme/theme";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settingsPage.rows.display, robots: { index: false } };
}

export default async function DisplaySettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  await requireUser(routes.settingsDisplay);
  const [t, store] = await Promise.all([getT(), cookies()]);
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);

  return (
    <SettingsSubpage
      title={t.settingsPage.rows.display}
      description={t.settingsPage.displayDescription}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t.language.title}</CardTitle>
          <CardDescription>{t.language.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitch />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.appearance.title}</CardTitle>
          <CardDescription>{t.appearance.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitch initial={theme} />
        </CardContent>
      </Card>
    </SettingsSubpage>
  );
}
