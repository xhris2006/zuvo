import { siteConfig } from "@/config/site";

/** Apparence choisie par l'utilisateur, mémorisée sur l'appareil (cookie). */
export type Theme = "light" | "dark";

export const THEME_COOKIE = "zuvo-theme";

/** Un an : la préférence d'affichage n'a rien de sensible. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Couleur de la barre du navigateur (mobile) pour chaque thème. */
export const themeColors: Record<Theme, string> = {
  light: siteConfig.themeColor,
  dark: "#0b1220",
};

/** Toute valeur inconnue ou absente retombe sur le thème clair. */
export function parseTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}
