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
import { getCities } from "@/features/locations/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.profilePages.editTitle, robots: { index: false } };
}

export default async function EditProfilePage() {
  if (!isSupabaseConfigured()) redirect(routes.profile);
  const { user } = await requireUser(routes.editProfile);
  const [profile, privateContact] = await Promise.all([
    getProfileById(user.id),
    getOwnPrivateContact(user.id),
  ]);
  if (!profile) redirect(routes.profile);
  const t = await getT();

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={t.profilePages.editTitle}
        actions={
          <Link href={routes.profile} className="text-sm font-semibold text-primary-ink">
            {t.profilePages.backToProfile}
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t.profilePages.publicCard}</CardTitle>
          <CardDescription>{t.profilePages.publicCardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            profile={profile}
            avatarUrl={avatarUrl(profile.avatar_path)}
            cities={await getCities()}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.profilePages.privateCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <PrivateContactForm phone={privateContact?.phone ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
