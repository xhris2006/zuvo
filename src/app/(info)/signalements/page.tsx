import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { legalUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { ReportsEn, ReportsFr } from "./content";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return publicPageMetadata({
    title: t.infoPages.reportsTitle,
    description: t.infoPages.reportsDescription(siteConfig.name),
    path: routes.reportsInfo,
  });
}

export default async function ReportsInfoPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? ReportsEn : ReportsFr;
  return (
    <DocumentPage
      title={t.infoPages.reportsTitle}
      intro={t.infoPages.reportsIntro}
      updatedAt={legalUpdatedAt.reports}
    >
      <Content name={siteConfig.name} />
    </DocumentPage>
  );
}
