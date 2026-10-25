import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { siteConfig } from "@/config/site";
import { RetryButton } from "./retry-button";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.errors.offlineMetaTitle, robots: { index: false } };
}

/** Page affichée par le service worker quand le réseau est indisponible. */
export default async function OfflinePage() {
  const t = await getT();
  return (
    <div className="container-page flex flex-col items-center pt-16">
      <EmptyState
        headingLevel="h1"
        icon={WifiOff}
        title={t.errors.offlineTitle}
        description={t.errors.offlineBody(siteConfig.name)}
        action={<RetryButton />}
      />
    </div>
  );
}
