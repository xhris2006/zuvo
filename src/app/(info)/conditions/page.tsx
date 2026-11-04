import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { legalUpdatedAt, publisher } from "@/config/legal";
import { routes } from "@/config/routes";
import { formatSupportPhone, siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { getSiteUrl, publicEnv } from "@/lib/env";
import { TermsEn, TermsFr } from "./content";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return publicPageMetadata({
    title: t.infoPages.termsTitle,
    description: t.infoPages.termsDescription(siteConfig.name),
    path: routes.terms,
    type: "article",
  });
}

export default async function TermsPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? TermsEn : TermsFr;
  return (
    <DocumentPage
      title={t.infoPages.termsHeading}
      intro={t.infoPages.termsIntro(siteConfig.name)}
      updatedAt={legalUpdatedAt.terms}
    >
      <Content
        name={siteConfig.name}
        country={t.site.country}
        host={new URL(getSiteUrl()).host}
        phone={formatSupportPhone()}
        phoneHref={`tel:${siteConfig.supportPhone}`}
        contactEmail={publicEnv.NEXT_PUBLIC_CONTACT_EMAIL}
        publisher={publisher}
      />
    </DocumentPage>
  );
}
