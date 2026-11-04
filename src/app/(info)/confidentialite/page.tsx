import type { Metadata } from "next";
import { DocumentPage } from "@/components/layout/document-page";
import { legalUpdatedAt, publisher } from "@/config/legal";
import { routes } from "@/config/routes";
import { formatSupportPhone, siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { getPublicSiteUrl, publicEnv } from "@/lib/env";
import { PrivacyEn, PrivacyFr } from "./content";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return publicPageMetadata({
    title: t.infoPages.privacyTitle,
    description: t.infoPages.privacyDescription(siteConfig.name),
    path: routes.privacy,
    type: "article",
  });
}

/** Politique de confidentialité : page publique, lisible sans compte (exigée par Google OAuth). */
export default async function PrivacyPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? PrivacyEn : PrivacyFr;
  return (
    <DocumentPage
      title={t.infoPages.privacyTitle}
      intro={t.infoPages.privacyIntro(siteConfig.name)}
      updatedAt={legalUpdatedAt.privacy}
    >
      <Content
        name={siteConfig.name}
        host={new URL(getPublicSiteUrl()).host}
        phone={formatSupportPhone()}
        phoneHref={`tel:${siteConfig.supportPhone}`}
        contactEmail={publicEnv.NEXT_PUBLIC_CONTACT_EMAIL}
        publisher={publisher}
        updated={t.format.date(legalUpdatedAt.privacy)}
      />
    </DocumentPage>
  );
}
