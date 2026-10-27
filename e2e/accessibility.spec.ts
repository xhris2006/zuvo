import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Pages accessibles sans compte, contrôlées avec axe (WCAG 2.1 A et AA). */
const pages = [
  "/",
  "/explorer",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/securite",
  "/aide",
  "/installer",
  "/conditions",
  "/hors-ligne",
  "/page-inexistante",
];

// Contrastes mesurés sur l'état final : les révélations au défilement dépendent de
// la position de la page (un titre sous la ligne de flottaison serait encore
// à demi transparent) et sont désactivées quand les animations sont réduites.
test.describe("axe", () => {
  test.use({ reducedMotion: "reduce" });

  for (const path of pages) {
    test(`${path} ne présente pas de défaut d'accessibilité détectable`, async ({ page }) => {
      await page.goto(path);
      await page.locator("h1").first().waitFor();
      // Les entrées animées (fondus, flous) doivent être terminées avant de mesurer les contrastes.
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => {
          if (animation.timeline !== document.timeline) return true;
          const iterations = animation.effect?.getComputedTiming().iterations;
          return iterations === Infinity || animation.playState !== "running";
        }),
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // Next.js insère un indicateur de route vide hors de la page.
        .exclude("next-route-announcer")
        .analyze();
      const summary = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
      }));
      expect(summary).toEqual([]);
    });
  }
});

test("aucune violation de la Content-Security-Policy", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/Content Security Policy|Content-Security-Policy|Refused to/i.test(text)) {
      violations.push(text);
    }
  });
  page.on("pageerror", (error) => violations.push(error.message));
  for (const path of ["/", "/explorer", "/connexion", "/inscription", "/vendre"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});

test("chaque page reçoit un nonce de script différent", async ({ request }) => {
  const nonceOf = async () => {
    const response = await request.get("/");
    const csp = response.headers()["content-security-policy"] ?? "";
    return /'nonce-([^']+)'/.exec(csp)?.[1];
  };
  const first = await nonceOf();
  expect(first).toBeTruthy();
  expect(await nonceOf()).not.toBe(first);
});

test("le manifeste PWA décrit l'application", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    short_name: "MboaDeal",
    display: "standalone",
    lang: "fr",
    theme_color: "#ff7a00",
  });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("512x512");
});

test("les ressources de marque sont de vraies images aux bonnes dimensions", async ({
  request,
}) => {
  // Largeur et hauteur d'un PNG : octets 16 à 23 de l'en-tête IHDR.
  const pngSize = (body: Buffer) => [body.readUInt32BE(16), body.readUInt32BE(20)];
  for (const [path, size] of [
    ["/icons/icon-192.png", 192],
    ["/icons/icon-512.png", 512],
    ["/icons/icon-maskable-512.png", 512],
    ["/icons/badge-96.png", 96],
    ["/apple-icon.png", 180],
  ] as const) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toBe("image/png");
    expect(pngSize(await response.body()), path).toEqual([size, size]);
  }
  for (const path of [
    "/images/mboadeal-logo.svg",
    "/images/mboadeal-logo-blanc.svg",
    "/icon.svg",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const svg = await response.text();
    expect(svg, path).toContain("<svg");
    // Logo autonome : ni image matricielle intégrée, ni texte dépendant d'une police.
    expect(svg, path).not.toMatch(/<image|<text/);
  }
  expect((await request.get("/favicon.ico")).status()).toBe(200);
});

test("hors connexion, la navigation affiche la page dédiée", async ({ page, context }) => {
  await page.goto("/");
  // Attend l'installation du service worker et la mise en cache de la page.
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker?.getRegistration("/");
    if (!registration?.active) return false;
    return Boolean(await caches.match("/hors-ligne"));
  });
  // Réseau coupé pour les requêtes du service worker (PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS).
  await context.route("**/explorer", (route) => route.abort("internetdisconnected"));
  await page.goto("/explorer").catch(() => undefined);
  await expect(
    page.getByRole("heading", { level: 1, name: "Vous êtes hors connexion" }),
  ).toBeVisible();
  // La feuille de style (mise en cache avec la page) est appliquée.
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(248, 247, 243)");
});
