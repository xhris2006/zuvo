import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getT } from "@/i18n/server";

/**
 * Pied de page des pages publiques pour les visiteurs (annonces, profils,
 * Explorer, documents) : liens vers l'aide et les documents juridiques. Masqué
 * sur les pages autonomes, qui ont leur propre pied de page.
 */
export async function SiteFooter() {
  const t = await getT();
  const links: { href: Route; label: string }[] = [
    { href: routes.help, label: t.footer.contact },
    { href: routes.terms, label: t.footer.terms },
    { href: routes.privacy, label: t.footer.privacy },
    { href: routes.safety, label: t.footer.safety },
    { href: routes.reportsInfo, label: t.footer.reports },
  ];
  return (
    <footer
      data-site-footer
      className="container-page mt-12 border-t border-border py-6 text-xs text-muted-foreground"
    >
      <nav aria-label={t.footer.legal}>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-3">
        © {new Date().getFullYear()} {siteConfig.name}. {t.footer.rights}
      </p>
    </footer>
  );
}
