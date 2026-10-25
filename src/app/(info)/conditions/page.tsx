import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { legalDraftUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { TermsEn, TermsFr } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t.infoPages.termsTitle,
    description: t.infoPages.termsDescription(siteConfig.name),
    alternates: { canonical: routes.terms },
  };
}

export default async function TermsPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? TermsEn : TermsFr;
  return (
    <DocumentPage
      title={t.infoPages.termsHeading}
      intro={t.infoPages.termsIntro(siteConfig.name)}
      updatedAt={legalDraftUpdatedAt}
      draft
    >
      <Content name={siteConfig.name} country={t.site.country} />
    </DocumentPage>
  );
}
