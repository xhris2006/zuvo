import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/layout/document-page";
import { routes } from "@/config/routes";
import { formatSupportPhone, siteConfig } from "@/config/site";
import { getLocale, getT } from "@/i18n/server";
import { HelpEn, HelpFr } from "./content";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t.infoPages.helpTitle,
    description: t.infoPages.helpDescription(siteConfig.name),
    alternates: { canonical: routes.help },
  };
}

export default async function HelpPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const Content = locale === "en" ? HelpEn : HelpFr;
  const name = siteConfig.name;
  const contactEmail = publicEnv.NEXT_PUBLIC_CONTACT_EMAIL;
  const values = [
    { title: t.home.values.freeTitle, body: t.home.values.freeBody },
    { title: t.home.values.noFeeTitle, body: t.home.values.noFeeBody },
    { title: t.home.values.directTitle, body: t.home.values.directBody },
  ];
  const links = [
    { href: routes.terms, label: t.footer.terms },
    { href: routes.privacy, label: t.footer.privacy },
    { href: routes.safety, label: t.footer.safety },
    { href: routes.reportsInfo, label: t.footer.reports },
  ];

  return (
    <DocumentPage title={t.infoPages.helpTitle} intro={t.infoPages.helpIntro(name)}>
      <h2>{t.home.valueTitle}</h2>
      <ul>
        {values.map((value) => (
          <li key={value.title}>
            <strong>{value.title}.</strong> {value.body}
          </li>
        ))}
      </ul>

      <Content name={name} phone={formatSupportPhone()} contactEmail={contactEmail} />

      <h2>{t.footer.legal}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <p>{t.footer.about}</p>
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} {name}. {t.footer.rights}
      </p>
    </DocumentPage>
  );
}
