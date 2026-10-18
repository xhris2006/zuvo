import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
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
  display: "swap",
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
          <main id="contenu" tabIndex={-1} className="flex-1 pb-safe-nav outline-none md:pb-16">
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </UnreadCountsProvider>
      </body>
    </html>
  );
}
