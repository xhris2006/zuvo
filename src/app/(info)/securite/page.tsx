import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { SafetyEn, SafetyFr } from "./content";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return publicPageMetadata({
    title: t.infoPages.safetyTitle,
    description: t.infoPages.safetyDescription,
    path: routes.safety,
  });
}

export default async function SafetyPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? SafetyEn : SafetyFr;
  return (
    <DocumentPage title={t.infoPages.safetyTitle} intro={t.infoPages.safetyIntro}>
      <Content name={siteConfig.name} />
    </DocumentPage>
  );
}
