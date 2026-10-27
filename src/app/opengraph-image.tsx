import { ImageResponse } from "next/og";
import { logoPaths } from "@/components/layout/logo-mark";
import { wordmarkPaths, wordmarkViewBox } from "@/components/layout/wordmark";
import { siteConfig } from "@/config/site";
import { defaultLocale, getDictionary } from "@/i18n";

/** Les robots des réseaux sociaux n'ont pas de préférence de langue : langue par défaut. */
const t = getDictionary(defaultLocale);

export const alt = `${siteConfig.name} — ${t.site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const orange = "#ff7a00";

/** Image de partage par défaut (réseaux sociaux, messageries) : noir profond et orange de marque. */
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
        background:
          "radial-gradient(circle at 92% 6%, rgba(255,122,0,0.45), rgba(255,122,0,0) 46%), linear-gradient(150deg, #263142 0%, #1f2937 55%, #141b26 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <svg width="104" height="104" viewBox="4 -14 260 260">
          <path
            d={logoPaths.handle}
            fill="none"
            stroke={orange}
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path d={logoPaths.body} fill={orange} />
          <path
            d={logoPaths.smile}
            fill="none"
            stroke={orange}
            strokeWidth="16"
            strokeLinecap="round"
          />
        </svg>
        {/* Nom vectorisé, identique au logo du site (la police par défaut n'a pas de gras). */}
        <svg width="440" height="72" viewBox={wordmarkViewBox}>
          <path d={wordmarkPaths.mboa} fill="#ffffff" />
          <path d={wordmarkPaths.deal} fill={orange} />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <span style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.1, maxWidth: 960 }}>
          {t.site.tagline}
        </span>
        <span style={{ fontSize: 30, color: "#f8f7f3", opacity: 0.85 }}>{t.site.ogSubtitle}</span>
      </div>
      <div
        style={{ display: "flex", height: 8, width: 160, borderRadius: 4, background: orange }}
      />
    </div>,
    size,
  );
}
