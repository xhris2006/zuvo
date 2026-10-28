import { siteConfig } from "@/config/site";

/** Apparence choisie par l'utilisateur, mémorisée sur l'appareil (cookie). */
export type Theme = "light" | "dark";

export const THEME_COOKIE = "zuvo-theme";

/** Un an : la préférence d'affichage n'a rien de sensible. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Couleur de la barre du navigateur (mobile) pour chaque thème. */
export const themeColors: Record<Theme, string> = {
  light: siteConfig.themeColor,
  dark: "#080a0d",
};

/**
 * Applique le thème tout de suite (navigateur uniquement) et le mémorise sur
 * cet appareil : le cookie est relu par le serveur au prochain affichage.
 */
export function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[next]);
}

/** Toute valeur inconnue ou absente retombe sur le thème clair. */
export function parseTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}
