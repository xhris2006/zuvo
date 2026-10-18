import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Favoris",
  robots: { index: false },
};

export default function FavoritesPage() {
  const t = getDictionary();
  return (
    <div className="container-page flex flex-col gap-8 pt-6 sm:pt-10">
      <PageHeader title={t.pages.favoritesTitle} />
      <AuthRequired returnTo={routes.favorites} />
    </div>
  );
}
