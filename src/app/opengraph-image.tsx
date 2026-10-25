import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { defaultLocale, getDictionary } from "@/i18n";

/** Les robots des réseaux sociaux n'ont pas de préférence de langue : langue par défaut. */
const t = getDictionary(defaultLocale);

export const alt = `${siteConfig.name} — ${t.site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image de partage par défaut (réseaux sociaux, messageries). */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #1f5fe0 0%, #1b4195 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="96" height="96" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#ffffff" />
          <path
            d="M10 10.5h12l-12 11h12"
            fill="none"
            stroke="#1f5fe0"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="23.5" cy="8.5" r="2" fill="#bfd5fd" />
        </svg>
        <span style={{ fontSize: 64, fontWeight: 700 }}>{siteConfig.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
          {t.home.heroTitle}
        </span>
        <span style={{ fontSize: 30, opacity: 0.9 }}>{t.site.ogSubtitle}</span>
      </div>
    </div>,
    size,
  );
}
