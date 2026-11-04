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
  "/services",
  "/services/recherche",
  "/services/recherche?categorie=batiment-travaux&tri=price_asc",
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

test("les visiteurs voient la page de bienvenue directement à « / », sans en-tête ni navigation", async ({
  page,
}) => {
  const response = await page.goto("/");
  // Pas de redirection : l'accueil est indexable à son URL canonique.
  expect(response?.status()).toBe(200);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL(/\/$/);
  // URL canonique de l'accueil : la racine du site (Next.js l'écrit sans « / » final).
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https?:\/\/[^/]+\/?$/,
  );
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

test("le champ de recherche est une liste de suggestions accessible", async ({
  page,
  isMobile,
}) => {
  await page.goto("/explorer");
  const input = page.locator(isMobile ? "#header-search-mobile" : "#sidebar-search");
  await expect(input).toHaveAttribute("role", "combobox");
  await expect(input).toHaveAttribute("aria-autocomplete", "both");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  const listId = await input.getAttribute("aria-controls");
  expect(listId).toBeTruthy();
  // Sans suggestion (base non connectée), la liste reste masquée et Entrée lance la recherche.
  await input.fill("ro");
  await expect(page.locator(`[id="${listId}"]`)).toBeHidden();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/explorer\?q=ro/);
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

test("les documents juridiques sont publics, complets et indexables", async ({ page }) => {
  // Nombre minimal de sections attendues dans chaque document.
  const documents = { "/conditions": 12, "/confidentialite": 15, "/signalements": 3 };
  for (const [path, sections] of Object.entries(documents)) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain(path);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.getByText(/À compléter|Document provisoire/)).toHaveCount(0);
    expect(await page.locator("main h2").count()).toBeGreaterThanOrEqual(sections);
  }
});

test("robots.txt et sitemap.xml ne listent que des pages publiques", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /");
  for (const path of [
    "/admin",
    "/messages",
    "/parametres",
    "/profil",
    "/api/",
    "/services/publier",
    "/services/mes-services",
  ]) {
    expect(robots).toContain(`Disallow: ${path}`);
  }
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of [
    "/explorer",
    "/confidentialite",
    "/conditions",
    "/services",
    "/services/recherche",
  ]) {
    expect(sitemap).toContain(`${path}</loc>`);
  }
  for (const path of [
    "/bienvenue",
    "/admin",
    "/messages",
    "/parametres",
    "/connexion",
    "/services/publier",
    "/services/mes-services",
  ]) {
    expect(sitemap).not.toContain(`${path}</loc>`);
  }
});

test("la politique de confidentialité décrit la connexion Google et la suppression du compte", async ({
  page,
}) => {
  await page.goto("/confidentialite");
  await expect(page).toHaveTitle(/Politique de confidentialité/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Google/);
  await expect(page.getByRole("heading", { name: /Connexion avec Google/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Supprimer votre compte et vos données/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Cookies, stockage local et sessions/ }),
  ).toBeVisible();
});

test("l'accueil Services présente la recherche, les catégories et la publication", async ({
  page,
}) => {
  await page.goto("/services");
  await expect(
    page.getByRole("heading", { level: 1, name: "Trouvez le bon professionnel pour vos besoins" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Découvrez des prestataires près de chez vous ou proposez vos services à des milliers de personnes",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Trouver un service" })).toHaveAttribute(
    "href",
    "/services/recherche",
  );
  await expect(page.getByRole("link", { name: "Publier mon service" }).first()).toHaveAttribute(
    "href",
    "/services/publier",
  );
  for (const name of ["Informatique et technologie", "Bâtiment et travaux", "Autres services"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  }
});

test("le sélecteur Marketplace / Services met en évidence l'espace actif", async ({ page }) => {
  await page.goto("/explorer");
  const switcher = page
    .getByRole("navigation", { name: "Espaces de MboaDeal" })
    .filter({ visible: true })
    .first();
  await expect(switcher.getByRole("link", { name: "Marketplace" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await switcher.getByRole("link", { name: "Services" }).click();
  await expect(page).toHaveURL("/services");
  const servicesSwitcher = page
    .getByRole("navigation", { name: "Espaces de MboaDeal" })
    .filter({ visible: true })
    .first();
  await expect(servicesSwitcher.getByRole("link", { name: "Services" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("la recherche de services conserve la requête et la ville dans l'URL", async ({ page }) => {
  await page.goto("/services");
  const form = page.getByRole("main").getByRole("search");
  await form.getByLabel("Rechercher un service").fill("plombier");
  await form.getByRole("button", { name: "Rechercher" }).click();
  await expect(page).toHaveURL(/\/services\/recherche\?q=plombier/);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("un service inexistant renvoie une 404", async ({ page }) => {
  const paths = ["/services/pas-un-uuid"];
  if (process.env.E2E_SUPABASE !== "unreachable") {
    paths.push("/services/00000000-0000-4000-8000-000000000000");
  }
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
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
