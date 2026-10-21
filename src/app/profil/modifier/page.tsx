import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { PrivateContactForm } from "@/features/profiles/components/private-contact-form";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getOwnPrivateContact, getProfileById } from "@/features/profiles/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Modifier mon profil",
  robots: { index: false },
};

export default async function EditProfilePage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.editProfile);
  const [profile, privateContact] = await Promise.all([
    getProfileById(user.id),
    getOwnPrivateContact(user.id),
  ]);
  if (!profile) redirect(routes.profile);

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title="Modifier mon profil"
        actions={
          <Link href={routes.profile} className="text-sm font-semibold text-primary">
            Retour au profil
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Profil public</CardTitle>
          <CardDescription>
            Ces informations sont visibles par tous les utilisateurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} avatarUrl={avatarUrl(profile.avatar_path)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Coordonnées privées</CardTitle>
        </CardHeader>
        <CardContent>
          <PrivateContactForm phone={privateContact?.phone ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
