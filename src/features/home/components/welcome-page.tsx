import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { Alert } from "@/components/ui/alert";
import { routes } from "@/config/routes";
import { formatSupportPhone, siteConfig } from "@/config/site";
import {
  type Category,
  getCategories,
  getDefaultCategories,
  getRecentListings,
} from "@/features/listings/queries";
import type { ListingCardData } from "@/features/listings/types";
import { getLocale, getT } from "@/i18n/server";
import { intlLocales } from "@/i18n";
import { getSiteUrl } from "@/lib/env";
import { WelcomeScreen } from "./welcome-screen";

/** Métadonnées de l'accueil des visiteurs, servi à « / » (URL canonique). */
export async function welcomeMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = `${siteConfig.name} — ${t.site.title}`;
  return {
    title: { absolute: title },
    description: t.site.description,
    alternates: { canonical: routes.home },
    openGraph: { title, description: t.site.description, url: routes.home },
  };
}

/** Annonces récentes (grille et mosaïque) ; une panne n'empêche pas l'affichage. */
async function loadRecentListings(): Promise<ListingCardData[]> {
  try {
    return await getRecentListings(12);
  } catch {
    return [];
  }
}

/** Catégories actives en base, ou liste initiale si la base est indisponible. */
async function loadCategories(): Promise<Category[]> {
  try {
    return await getCategories();
  } catch {
    return getDefaultCategories();
  }
}

/**
 * Accueil des visiteurs non connectés (« / » et « /bienvenue ») : page autonome
 * avec son propre en-tête et pied de page, et les données structurées du site.
 */
export async function WelcomePage({ accountDeleted = false }: { accountDeleted?: boolean }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const [listings, categories] = await Promise.all([loadRecentListings(), loadCategories()]);
  const siteUrl = getSiteUrl();
  return (
    <div data-standalone>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${siteUrl}/#website`,
              name: siteConfig.name,
              description: t.site.description,
              url: `${siteUrl}/`,
              inLanguage: intlLocales[locale],
              publisher: { "@id": `${siteUrl}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}${routes.explore}?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              "@id": `${siteUrl}/#organization`,
              name: siteConfig.name,
              url: `${siteUrl}/`,
              logo: `${siteUrl}/icons/icon-512.png`,
              slogan: t.site.tagline,
              areaServed: { "@type": "Country", name: t.site.country },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                telephone: formatSupportPhone().replace(/ /g, "-"),
                availableLanguage: ["French", "English"],
              },
            },
          ],
        }}
      />
      <WelcomeScreen
        listings={listings}
        categories={categories}
        notice={
          accountDeleted ? (
            <Alert
              variant="success"
              title={t.authPages.accountDeletedTitle}
              role="status"
              className="text-left"
            >
              {t.authPages.accountDeletedBody(siteConfig.name)}
            </Alert>
          ) : null
        }
      />
    </div>
  );
}
