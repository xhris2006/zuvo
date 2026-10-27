import { expect, test } from "@playwright/test";

const publicPages = [
  "/",
  "/bienvenue",
  "/explorer",
  "/vendre",
  "/messages",
  "/profil",
  "/favoris",
  "/notifications",
  "/connexion",
  "/inscription",
  "/conditions",
  "/confidentialite",
  "/securite",
  "/aide",
  "/signalements",
  "/mot-de-passe-oublie",
  "/inscription/verification",
  "/auth/confirm",
  "/fil",
  "/installer",
];

test.describe("pages publiques", () => {
  for (const path of publicPages) {
    test(`${path} s'affiche sans débordement horizontal`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      expect(pageErrors).toEqual([]);
    });
  }
});

test("les visiteurs arrivent sur la page de bienvenue, sans en-tête ni navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/bienvenue$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Achète. Vends. Donne une seconde vie." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer un compte" })).toHaveAttribute(
    "href",
    "/inscription",
  );
  await expect(page.getByRole("link", { name: "J'ai déjà un compte" })).toHaveAttribute(
    "href",
    "/connexion",
  );
  await expect(page.locator("[data-site-header]")).toBeHidden();
  await expect(page.locator("[data-bottom-nav]")).toBeHidden();
  await expect(page).toHaveTitle("MboaDeal — Achète, vends et trouve de bonnes affaires");
});

test("les catégories sont présentées dans Explorer", async ({ page }) => {
  await page.goto("/explorer");
  await expect(page.getByRole("heading", { name: "Catégories" })).toBeVisible();
});

test("le thème sombre mémorisé s'applique dès le rendu serveur", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "zuvo-theme", value: "dark", url: baseURL }]);
  await page.goto("/aide");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("la langue anglaise mémorisée s'applique dès le rendu serveur", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "zuvo-locale", value: "en", url: baseURL }]);
  await page.goto("/aide");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Help and contact" })).toBeVisible();
});

test("la bascule FR / EN de la page de bienvenue change la langue", async ({ page }) => {
  await page.goto("/bienvenue");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("button", { name: "English" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Buy. Sell. Give things a second life." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Le choix est mémorisé : il s'applique aux pages suivantes.
  await page.goto("/connexion");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
});

test("le guide d'installation s'ouvre sur l'appareil détecté", async ({ page, isMobile }) => {
  await page.goto("/installer");
  await expect(
    page.getByRole("heading", { level: 1, name: "Installer l'application" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: isMobile ? "Android" : "Ordinateur" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "iPhone, iPad" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Sur l'écran d'accueil");
});

test("la navigation mobile n'apparaît que sur petit écran", async ({ page, isMobile }) => {
  await page.goto("/aide");
  const bottomNav = page.locator("nav.fixed");
  if (isMobile) {
    await expect(bottomNav).toBeVisible();
    await bottomNav.getByRole("link", { name: "Explorer" }).click();
    await expect(page).toHaveURL(/\/explorer$/);
    await expect(bottomNav.getByRole("link", { name: "Explorer" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  } else {
    await expect(bottomNav).toBeHidden();
  }
});

test("la recherche mène à Explorer avec la requête", async ({ page, isMobile }) => {
  await page.goto("/explorer");
  // Mobile : champ sous l'en-tête ; ordinateur : champ de la barre latérale.
  const search = page.locator(isMobile ? "#header-search-mobile" : "#sidebar-search");
  await search.fill("robe wax");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/explorer\?q=robe\+wax/);
  const keywords = page.getByLabel("Mots-clés");
  if (!isMobile) await expect(keywords).toHaveValue("robe wax");
});

test("la recherche vide fait défiler des suggestions sans remplir le champ", async ({
  page,
  isMobile,
}) => {
  await page.goto("/explorer");
  const input = page.locator(isMobile ? "#header-search-mobile" : "#sidebar-search");
  const form = page.locator("form[role=search]").filter({ has: input });
  const suggestion = form.locator('span[aria-hidden="true"]').filter({ hasText: /\S/ });
  await expect(suggestion).toBeVisible({ timeout: 8000 });
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("placeholder", "Rechercher un article…");
  await input.focus();
  await expect(suggestion).toHaveCount(0);
});

test.describe("animations réduites", () => {
  test.use({ reducedMotion: "reduce" });

  test("la page de bienvenue s'affiche entièrement, sans animation d'entrée", async ({ page }) => {
    await page.goto("/bienvenue");
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText("Achète. Vends. Donne une seconde vie.");
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getComputedTiming().iterations !== Infinity,
          ).length,
    );
    expect(running).toBe(0);
    const opacities = await title
      .locator("span")
      .evaluateAll((words) => words.map((word) => getComputedStyle(word).opacity));
    expect(new Set(opacities)).toEqual(new Set(["1"]));
    await expect(page.getByRole("link", { name: "Créer un compte" })).toHaveCSS("opacity", "1");
  });

  test("la recherche ne fait pas défiler de suggestions", async ({ page, isMobile }) => {
    await page.goto("/explorer");
    const input = page.locator(isMobile ? "#header-search-mobile" : "#sidebar-search");
    const form = page.locator("form[role=search]").filter({ has: input });
    await page.waitForTimeout(2500);
    await expect(form.locator('span[aria-hidden="true"]')).toHaveCount(0);
  });
});

test("les filtres invalides dans l'URL sont ignorés", async ({ page }) => {
  const response = await page.goto("/explorer?city=paris&minPrice=-3&sort=hack&page=0");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Explorer" })).toBeVisible();
});

test("les filtres mobiles s'ouvrent dans une feuille et se referment après envoi", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Feuille de filtres réservée au mobile");
  await page.goto("/explorer");
  await page.getByRole("button", { name: "Filtres" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtres" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Ville").selectOption("douala");
  await dialog.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/city=douala/);
  await expect(dialog).toBeHidden();
});

test("une page inconnue renvoie une 404 soignée", async ({ page }) => {
  const response = await page.goto("/page-qui-n-existe-pas");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});

test("le lien d'évitement mène au contenu principal", async ({ page, isMobile }) => {
  test.skip(isMobile, "Navigation clavier testée sur ordinateur");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Aller au contenu principal" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenu")).toBeFocused();
});

test("les en-têtes de sécurité sont présents", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("les documents juridiques sont marqués comme brouillons", async ({ page }) => {
  for (const path of ["/conditions", "/confidentialite", "/signalements"]) {
    await page.goto(path);
    await expect(page.getByText("Document provisoire")).toBeVisible();
  }
});

test("une annonce inexistante renvoie une 404", async ({ page }) => {
  const paths = ["/annonces/pas-un-uuid"];
  // Sans base de données joignable, seul l'identifiant invalide est vérifiable.
  if (process.env.E2E_SUPABASE !== "unreachable") {
    paths.push("/annonces/00000000-0000-4000-8000-000000000000");
  }
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});

test("le service worker est servi sans cache et avec une CSP stricte", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["content-type"]).toContain("javascript");
  expect(headers["cache-control"]).toContain("no-cache");
  expect(headers["content-security-policy"]).toBe("default-src 'self'; script-src 'self'");
});
