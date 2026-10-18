import { expect, test } from "@playwright/test";

const publicPages = [
  "/",
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

test("la page d'accueil présente l'offre et les catégories", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Donnez une seconde vie à vos affaires" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parcourir par catégorie" })).toBeVisible();
  await expect(page).toHaveTitle(/Zuvo/);
});

test("la navigation mobile n'apparaît que sur petit écran", async ({ page, isMobile }) => {
  await page.goto("/");
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

test("la recherche de l'en-tête mène à Explorer avec la requête", async ({ page, isMobile }) => {
  await page.goto("/");
  const search = page.locator(isMobile ? "#header-search-mobile" : "#header-search");
  await search.fill("robe wax");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/explorer\?q=robe\+wax/);
  const keywords = page.getByLabel("Mots-clés");
  if (!isMobile) await expect(keywords).toHaveValue("robe wax");
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
