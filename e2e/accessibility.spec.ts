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

for (const path of pages) {
  test(`${path} ne présente pas de défaut d'accessibilité détectable`, async ({ page }) => {
    await page.goto(path);
    await page.locator("h1").first().waitFor();
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
  expect(manifest).toMatchObject({ short_name: "Zuvo", display: "standalone", lang: "fr" });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("512x512");
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
  expect(background).toBe("rgb(247, 249, 252)");
});
