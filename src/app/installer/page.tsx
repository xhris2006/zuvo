import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { InstallGuide } from "@/features/install/components/install-guide";
import { platformFromUserAgent } from "@/features/install/platform";
import { getT } from "@/i18n/server";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return publicPageMetadata({
    title: t.installPage.title,
    description: t.installPage.description,
    path: routes.install,
  });
}

/** Guide d'installation de l'application, ouvert sur l'appareil de l'utilisateur. */
export default async function InstallPage() {
  const t = await getT();
  const platform = platformFromUserAgent((await headers()).get("user-agent") ?? "");
  return (
    <div className="container-page flex max-w-2xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader title={t.installPage.title} description={t.installPage.description} />
      <InstallGuide initialPlatform={platform} />
    </div>
  );
}
