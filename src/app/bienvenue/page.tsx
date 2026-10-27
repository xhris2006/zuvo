import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { Alert } from "@/components/ui/alert";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { WelcomeScreen } from "@/features/home/components/welcome-screen";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: `${siteConfig.name} — ${t.site.title}` },
    alternates: { canonical: "/bienvenue" },
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
 * Accueil des visiteurs non connectés (l'accueil « / » les redirige ici) :
 * page autonome avec son propre en-tête et pied de page.
 */
export default async function WelcomePage(props: PageProps<"/bienvenue">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const searchParams = await props.searchParams;
  const [listings, categories] = await Promise.all([loadRecentListings(), loadCategories()]);
  const siteUrl = getSiteUrl();
  return (
    <div data-standalone>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          description: t.site.description,
          url: siteUrl,
          inLanguage: intlLocales[locale],
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteUrl}${routes.explore}?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <WelcomeScreen
        listings={listings}
        categories={categories}
        notice={
          searchParams.compte === "supprime" ? (
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
