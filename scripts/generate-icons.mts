/**
 * Génère les icônes PNG (PWA, notifications, iOS) à partir du logo vectoriel.
 * Usage : node scripts/generate-icons.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#1f5fe0";
const ACCENT = "#bfd5fd";

// Tracé du logo sur une grille 32×32 (identique à src/app/icon.svg).
const glyph = (color: string, accent: string | null) =>
  `<path d="M10 10.5h12l-12 11h12" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
  (accent ? `<circle cx="23.5" cy="8.5" r="2" fill="${accent}"/>` : "");

/** Logo centré, réduit d'un facteur `scale` (zone de sécurité des icônes masquables). */
function svg({
  rounded,
  background,
  scale = 1,
  accent = ACCENT,
  color = "#fff",
}: {
  rounded: boolean;
  background: string | null;
  scale?: number;
  accent?: string | null;
  color?: string;
}) {
  const offset = (32 - 32 * scale) / 2;
  const rect = background
    ? `<rect width="32" height="32" ${rounded ? 'rx="9"' : ""} fill="${background}"/>`
    : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${rect}` +
      `<g transform="translate(${offset} ${offset}) scale(${scale})">${glyph(color, accent)}</g></svg>`,
  );
}

async function png(source: Buffer, size: number, file: string) {
  await writeFile(file, await sharp(source, { density: 1200 }).resize(size, size).png().toBuffer());
  console.log(`${file} (${size}×${size})`);
}

await mkdir("public/icons", { recursive: true });
await png(svg({ rounded: true, background: BRAND }), 192, "public/icons/icon-192.png");
await png(svg({ rounded: true, background: BRAND }), 512, "public/icons/icon-512.png");
await png(
  svg({ rounded: false, background: BRAND, scale: 0.8 }),
  512,
  "public/icons/icon-maskable-512.png",
);
// Badge Android : seule la transparence est utilisée (silhouette blanche).
await png(
  svg({ rounded: false, background: null, scale: 1.3, accent: "#fff" }),
  96,
  "public/icons/badge-96.png",
);
// iOS arrondit lui-même les angles.
await png(svg({ rounded: false, background: BRAND }), 180, "src/app/apple-icon.png");
