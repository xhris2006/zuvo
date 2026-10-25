import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteSidebar } from "@/components/layout/site-sidebar";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { siteConfig } from "@/config/site";
import { SiteAnnouncementBanner } from "@/features/announcements/components/site-announcement";
import { getCurrentUser } from "@/features/auth/session";
import { PushSync } from "@/features/notifications/components/push-sync";
import { UnreadCountsProvider } from "@/features/notifications/components/unread-counts";
import { getUnreadCounts } from "@/features/notifications/queries";
import { parseTheme, THEME_COOKIE, themeColors } from "@/features/theme/theme";
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

/** Thème choisi dans les paramètres (cookie de l'appareil), clair par défaut. */
async function getTheme() {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: themeColors[await getTheme()],
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendu à chaque requête : nécessaire au nonce de la CSP (src/proxy.ts) et
  // à l'affichage de la session dans l'en-tête.
  await connection();
  const t = getDictionary();
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCounts() : { messages: 0, notifications: 0 };
  const theme = await getTheme();
  return (
    <html lang={siteConfig.defaultLocale} className={jakarta.variable} data-theme={theme}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenu"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t.common.skipToContent}
        </a>
        <UnreadCountsProvider userId={user?.id ?? null} initial={unread}>
          <SiteSidebar />
          {/* Colonne de contenu, décalée de la barre latérale sur ordinateur. */}
          <div data-shell className="flex min-h-dvh flex-1 flex-col lg:pl-64">
            <SiteHeader />
            <SiteAnnouncementBanner />
            <main
              id="contenu"
              tabIndex={-1}
              className="min-h-dvh flex-1 pb-safe-nav outline-none md:pb-16"
            >
              {children}
            </main>
          </div>
          <BottomNav />
        </UnreadCountsProvider>
        <ServiceWorkerRegistrar />
        {user ? <PushSync /> : null}
      </body>
    </html>
  );
}
