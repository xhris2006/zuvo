import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { ListingEditor } from "@/features/listings/components/listing-editor";
import { getCategories } from "@/features/listings/queries";
import { getProfileById } from "@/features/profiles/queries";
import { getT } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getCities } from "@/features/locations/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.sellPage.metaTitle, robots: { index: false } };
}

export default async function SellPage() {
  const t = await getT();
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
        <PageHeader title={t.pages.sellTitle} />
        <AuthRequired returnTo={routes.sell} description={t.auth.sellRequiredBody} />
      </div>
    );
  }

  const { user } = await requireUser(routes.sell);
  const [categories, profile, cities] = await Promise.all([
    getCategories(),
    getProfileById(user.id),
    getCities(),
  ]);

  return (
    <div className="container-page flex max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={t.pages.sellTitle}
        description={<span className="hidden sm:inline">{t.sellPage.description}</span>}
      />
      <ListingEditor
        userId={user.id}
        categories={categories}
        cities={cities}
        defaultCity={profile?.city}
      />
    </div>
  );
}
