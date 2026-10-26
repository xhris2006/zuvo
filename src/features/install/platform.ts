/** Appareil, pour adapter le guide d'installation de l'application. */
export type InstallPlatform = "ios" | "android" | "desktop";

export const installPlatforms: readonly InstallPlatform[] = ["android", "ios", "desktop"];

/** Appareil d'après l'en-tête User-Agent (côté serveur ou navigateur). */
export function platformFromUserAgent(userAgent: string): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

/** Dans le navigateur : un iPad récent se présente comme un Mac, reconnu au toucher. */
export function detectPlatform(): InstallPlatform {
  const platform = platformFromUserAgent(navigator.userAgent);
  if (
    platform === "desktop" &&
    /Macintosh/.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 1
  ) {
    return "ios";
  }
  return platform;
}

/** Vrai quand le site est ouvert comme application installée. */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
