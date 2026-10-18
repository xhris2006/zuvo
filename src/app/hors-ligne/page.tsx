import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { siteConfig } from "@/config/site";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = {
  title: "Hors connexion",
  robots: { index: false },
};

/** Page affichée par le service worker quand le réseau est indisponible. */
export default function OfflinePage() {
  return (
    <div className="container-page flex flex-col items-center pt-16">
      <EmptyState
        headingLevel="h1"
        icon={WifiOff}
        title="Vous êtes hors connexion"
        description={`Vérifiez votre connexion Internet puis réessayez. ${siteConfig.name} a besoin du réseau pour afficher les annonces et vos messages.`}
        action={<RetryButton />}
      />
    </div>
  );
}
