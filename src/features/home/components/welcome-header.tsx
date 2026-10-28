import { Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SearchForm } from "@/components/layout/search-form";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { LanguageToggle } from "@/features/language/components/language-switch";
import { getT } from "@/i18n/server";

/**
 * En-tête de la page d'accueil des visiteurs (la page est autonome : l'en-tête
 * et la navigation du site y sont masqués). Sur téléphone : logo, langue,
 * connexion et vente ; les catégories et la recherche apparaissent sur les
 * écrans plus larges, la recherche restant dans la section principale.
 */
export async function WelcomeHeader() {
  const t = await getT();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/75 dark:bg-chrome/95">
      <div className="container-page flex h-16 items-center gap-1 sm:gap-3">
        <Logo compact className="shrink-0" />
        <nav aria-label={t.nav.primary} className="ml-3 hidden items-center gap-1 lg:flex">
          <a
            href="#categories"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t.welcome.categoriesLink}
          </a>
          <Link
            href={routes.explore}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t.nav.explore}
          </Link>
        </nav>
        <SearchForm id="welcome-header-search" className="ml-2 hidden max-w-sm flex-1 xl:block" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageToggle compact />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full max-sm:size-9 max-sm:px-0"
          >
            <Link href={routes.signIn}>
              <UserRound aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t.welcome.signInShort}</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden rounded-full md:inline-flex"
          >
            <Link href={routes.signUp}>{t.welcome.signUpShort}</Link>
          </Button>
          {/* Très petits écrans (360 px) : bouton icône, libellé pour les lecteurs d'écran. */}
          <Button
            asChild
            size="sm"
            className="rounded-full max-sm:gap-1.5 max-sm:px-2.5 max-[25rem]:size-9 max-[25rem]:px-0"
          >
            <Link href={routes.sell}>
              <Plus aria-hidden="true" />
              <span className="max-[25rem]:sr-only sm:hidden">{t.nav.sell}</span>
              <span className="hidden sm:inline">{t.nav.sellCta}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
