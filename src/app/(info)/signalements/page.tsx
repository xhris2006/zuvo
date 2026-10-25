import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { legalDraftUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { ReportsEn, ReportsFr } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t.infoPages.reportsTitle,
    description: t.infoPages.reportsDescription(siteConfig.name),
    alternates: { canonical: routes.reportsInfo },
  };
}

export default async function ReportsInfoPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? ReportsEn : ReportsFr;
  return (
    <DocumentPage
      title={t.infoPages.reportsTitle}
      intro={t.infoPages.reportsIntro}
      updatedAt={legalDraftUpdatedAt}
      draft
    >
      <Content name={siteConfig.name} />
    </DocumentPage>
  );
}
