import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/features/auth/session";
import { UnreadCountsProvider } from "@/features/notifications/components/unread-counts";
import { getUnreadCounts } from "@/features/notifications/queries";
import { getDictionary } from "@/i18n";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  // « optional » : pas de second rendu du texte quand la police arrive tard
  // (connexions mobiles lentes) ; la police de repli est ajustée par next/font.
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "fr_CM",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendu à chaque requête : nécessaire au nonce de la CSP (src/proxy.ts) et
  // à l'affichage de la session dans l'en-tête.
  await connection();
  const t = getDictionary();
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCounts() : { messages: 0, notifications: 0 };
  return (
    <html lang={siteConfig.defaultLocale} className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenu"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t.common.skipToContent}
        </a>
        <UnreadCountsProvider userId={user?.id ?? null} initial={unread}>
          <SiteHeader />
          <main
            id="contenu"
            tabIndex={-1}
            className="min-h-dvh flex-1 pb-safe-nav outline-none md:pb-16"
          >
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </UnreadCountsProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
