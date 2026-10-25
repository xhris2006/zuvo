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

export const metadata: Metadata = { title: "Anti-spam" };

export default async function AdminAntiSpamPage() {
  await requireAdmin(routes.adminAntiSpam);
  const [settings, words] = await Promise.all([getAntiSpamSettings(), getBannedWords()]);

  return (
    <>
      <PageHeader
        title="Anti-spam"
        description="Règles appliquées par la base de données à chaque annonce. Chaque modification est inscrite au journal de configuration."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nouveaux comptes</CardTitle>
          <CardDescription>
            Limite le nombre d&apos;annonces qu&apos;un compte récent peut publier en 24 heures.
            Au-delà, l&apos;annonce reste en brouillon et le vendeur est invité à réessayer le
            lendemain.
          </CardDescription>
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
          <CardTitle>Mots interdits</CardTitle>
          <CardDescription>
            Une annonce dont le titre ou la description contient l&apos;un de ces mots (mot entier,
            sans tenir compte des majuscules ni des accents) ne peut pas être enregistrée.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BannedWordForm />
          {words.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun mot interdit pour le moment.</p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Mots interdits">
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
                      aria-label={`Retirer « ${word.word} »`}
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
          <CardTitle>Doublons</CardTitle>
          <CardDescription>
            Les annonces en ligne au titre identique (même vendeur, ou même description chez des
            vendeurs différents) sont listées pour l&apos;équipe de modération.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`${routes.adminListings}?vue=doublons` as Route}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Copy className="size-4" aria-hidden="true" />
            Voir les doublons probables
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
