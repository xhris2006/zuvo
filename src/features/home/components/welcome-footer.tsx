import type { Route } from "next";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/layout/logo";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getT } from "@/i18n/server";

/** Pied de page de la page d'accueil des visiteurs : marque et liens utiles, sur fond noir profond. */
export async function WelcomeFooter() {
  const t = await getT();
  const links: { href: Route; label: string }[] = [
    { href: routes.explore, label: t.nav.explore },
    { href: routes.help, label: t.footer.contact },
    { href: routes.safety, label: t.footer.safety },
    { href: routes.reportsInfo, label: t.footer.reports },
    { href: routes.terms, label: t.footer.terms },
    { href: routes.privacy, label: t.footer.privacy },
    { href: routes.install, label: t.welcome.footerInstall },
  ];

  return (
    <footer className="bg-inverse pb-[env(safe-area-inset-bottom)] text-inverse-foreground">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-[1.1fr_1fr] lg:py-12">
        <div className="flex flex-col gap-3">
          <Link
            href={routes.home}
            className="inline-flex items-center gap-2 self-start rounded-lg"
            aria-label={t.ui.homeLink(siteConfig.name)}
          >
            <LogoMark />
            <Wordmark tone="inverse" />
          </Link>
          <p className="font-semibold">{t.site.tagline}</p>
          <p className="max-w-sm text-sm text-white/70">{t.footer.about}</p>
        </div>
        <nav aria-labelledby="footer-links-title">
          <h2 id="footer-links-title" className="text-sm font-semibold">
            {t.welcome.footerNav}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-white/65">
          © {new Date().getFullYear()} {siteConfig.name}. {t.footer.rights} · {t.site.country}
        </p>
      </div>
    </footer>
  );
}
