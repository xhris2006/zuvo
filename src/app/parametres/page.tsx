import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { requireUser } from "@/features/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Paramètres",
  robots: { index: false },
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.settings);

  return (
    <div className="container-page flex max-w-2xl flex-col gap-6 pt-6 sm:pt-10">
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
    </div>
  );
}
