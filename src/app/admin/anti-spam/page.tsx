import { Copy, X } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { AntiSpamSettingsForm, BannedWordForm } from "@/features/admin/components/anti-spam-forms";
import { removeBannedWordAction } from "@/features/admin/management-actions";
import { getAntiSpamSettings, getBannedWords } from "@/features/admin/management-queries";
import { requireAdmin } from "@/features/admin/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.antiSpam };
}

export default async function AdminAntiSpamPage() {
  await requireAdmin(routes.adminAntiSpam);
  const t = await getT();
  const [settings, words] = await Promise.all([getAntiSpamSettings(), getBannedWords()]);

  return (
    <>
      <PageHeader title={t.adminUi.nav.antiSpam} description={t.adminPages.antiSpam.description} />

      <Card>
        <CardHeader>
          <CardTitle>{t.adminPages.antiSpam.newAccounts}</CardTitle>
          <CardDescription>{t.adminPages.antiSpam.newAccountsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <AntiSpamSettingsForm
            newAccountDays={settings.newAccountDays}
            newAccountDailyListings={settings.newAccountDailyListings}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.adminPages.antiSpam.bannedWords}</CardTitle>
          <CardDescription>{t.adminPages.antiSpam.bannedWordsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BannedWordForm />
          {words.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.adminPages.antiSpam.noBannedWords}</p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label={t.adminPages.antiSpam.bannedWords}>
              {words.map((word) => (
                <li key={word.id}>
                  <form
                    action={removeBannedWordAction}
                    className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm"
                  >
                    <input type="hidden" name="id" value={word.id} />
                    {word.word}
                    <SubmitButton
                      variant="ghost"
                      size="sm"
                      className="size-7 rounded-full p-0"
                      aria-label={t.adminPages.antiSpam.removeWord(word.word)}
                    >
                      <X aria-hidden="true" />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.adminPages.antiSpam.duplicates}</CardTitle>
          <CardDescription>{t.adminPages.antiSpam.duplicatesDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`${routes.adminListings}?vue=doublons` as Route}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-ink hover:underline"
          >
            <Copy className="size-4" aria-hidden="true" />
            {t.adminPages.antiSpam.seeDuplicates}
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
