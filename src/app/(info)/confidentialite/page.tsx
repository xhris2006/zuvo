import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { legalDraftUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { PrivacyEn, PrivacyFr } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t.infoPages.privacyTitle,
    description: t.infoPages.privacyDescription(siteConfig.name),
    alternates: { canonical: routes.privacy },
  };
}

export default async function PrivacyPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? PrivacyEn : PrivacyFr;
  return (
    <DocumentPage
      title={t.infoPages.privacyTitle}
      intro={t.infoPages.privacyIntro}
      updatedAt={legalDraftUpdatedAt}
      draft
    >
      <Content name={siteConfig.name} />
    </DocumentPage>
  );
}
