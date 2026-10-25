import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { Alert } from "@/components/ui/alert";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { WelcomeScreen } from "@/features/home/components/welcome-screen";
import { getRecentListings } from "@/features/listings/queries";
import type { ListingCardData } from "@/features/listings/types";
import { getSiteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  alternates: { canonical: "/bienvenue" },
};

/** Annonces récentes pour la mosaïque ; une panne n'empêche pas l'affichage. */
async function loadMosaicListings(): Promise<ListingCardData[]> {
  try {
    return await getRecentListings(12);
  } catch {
    return [];
  }
}

/**
 * Page autonome (sans en-tête ni barre de navigation) vers laquelle l'accueil
 * redirige les visiteurs non connectés.
 */
export default async function WelcomePage(props: PageProps<"/bienvenue">) {
  const searchParams = await props.searchParams;
  const listings = await loadMosaicListings();
  const siteUrl = getSiteUrl();
  return (
    <div data-standalone>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          description: siteConfig.description,
          url: siteUrl,
          inLanguage: siteConfig.intlLocale,
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
        notice={
          searchParams.compte === "supprime" ? (
            <Alert variant="success" title="Compte supprimé" role="status" className="text-left">
              Votre compte et vos annonces ont été supprimés. Merci d&apos;avoir utilisé{" "}
              {siteConfig.name}.
            </Alert>
          ) : null
        }
      />
    </div>
  );
}
