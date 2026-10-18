import { PackagePlus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { MemberGate } from "@/features/auth/components/member-gate";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Vendre un article",
  robots: { index: false },
};

export default function SellPage() {
  const t = getDictionary();
  return (
    <div className="container-page flex flex-col gap-8 pt-6 sm:pt-10">
      <PageHeader title={t.pages.sellTitle} />
      <MemberGate returnTo={routes.sell} description={t.auth.sellRequiredBody}>
        <EmptyState
          icon={PackagePlus}
          title="La publication d'annonces arrive bientôt"
          description="Le formulaire de mise en vente sera disponible dans la prochaine version."
        />
      </MemberGate>
    </div>
  );
}
