import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n";
import { LogoMark } from "./logo";

export function SiteFooter() {
  const t = getDictionary();
  const groups = [
    {
      title: t.footer.legal,
      links: [
        { href: routes.terms, label: t.footer.terms },
        { href: routes.privacy, label: t.footer.privacy },
      ],
    },
    {
      title: t.footer.help,
      links: [
        { href: routes.safety, label: t.footer.safety },
        { href: routes.reportsInfo, label: t.footer.reports },
        { href: routes.help, label: t.footer.contact },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LogoMark className="size-7" />
            <span className="text-lg font-bold tracking-tight">{siteConfig.name}</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">{t.footer.about}</p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-page">
        <p className="border-t border-border py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
