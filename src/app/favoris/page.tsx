import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { MemberGate } from "@/features/auth/components/member-gate";
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
      <MemberGate returnTo={routes.favorites}>
        <EmptyState
          icon={Heart}
          title="Aucun favori"
          description="Ajoutez des annonces à vos favoris pour les retrouver facilement ici."
        />
      </MemberGate>
    </div>
  );
}
