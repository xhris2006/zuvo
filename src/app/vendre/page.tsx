import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { requireUser } from "@/features/auth/session";
import { ListingEditor } from "@/features/listings/components/listing-editor";
import { getCategories } from "@/features/listings/queries";
import { getProfileById } from "@/features/profiles/queries";
import { getDictionary } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Vendre un article",
  robots: { index: false },
};

export default async function SellPage() {
  const t = getDictionary();
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex flex-col gap-8 pt-6 sm:pt-10">
        <PageHeader title={t.pages.sellTitle} />
        <AuthRequired returnTo={routes.sell} description={t.auth.sellRequiredBody} />
      </div>
    );
  }

  const { user } = await requireUser(routes.sell);
  const [categories, profile] = await Promise.all([getCategories(), getProfileById(user.id)]);

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-6 sm:pt-10">
      <PageHeader
        title={t.pages.sellTitle}
        description="Gratuit et sans commission. Des photos nettes et une description honnête font vendre plus vite."
      />
      <Card>
        <CardContent>
          <ListingEditor userId={user.id} categories={categories} defaultCity={profile?.city} />
        </CardContent>
      </Card>
    </div>
  );
}
