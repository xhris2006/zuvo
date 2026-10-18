import { expect, test } from "@playwright/test";

/**
 * Deux modes, selon la façon dont l'application a été construite :
 *  - par défaut, Supabase n'est pas configuré ;
 *  - E2E_SUPABASE=unreachable : Supabase est configuré mais injoignable, ce qui
 *    permet de vérifier redirections, validations et messages d'erreur.
 */
const mode = process.env.E2E_SUPABASE ?? "unconfigured";

test.describe("authentification non configurée", () => {
  test.skip(mode !== "unconfigured", "Mode Supabase non configuré uniquement");

  for (const path of ["/connexion", "/inscription", "/mot-de-passe-oublie"]) {
    test(`${path} explique que la connexion n'est pas encore disponible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText("Authentification pas encore disponible")).toBeVisible();
    });
  }

  test("les pages membres invitent à se connecter", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "Connexion requise" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" }).last()).toHaveAttribute(
      "href",
      "/connexion?next=%2Fmessages",
    );
  });
});

test.describe("authentification configurée (service injoignable)", () => {
  test.skip(mode !== "unreachable", "Mode Supabase injoignable uniquement");

  test("redirige les pages membres vers la connexion avec retour", async ({ page }) => {
    for (const path of [
      "/profil",
      "/vendre",
      "/messages",
      "/parametres",
      "/profil/modifier",
      "/fil",
      "/favoris",
      "/messages/4f1c2a3b-0000-4000-8000-0000000000bb",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(`/connexion?next=${encodeURIComponent(path)}`);
    }
  });

  test("affiche les erreurs de validation de la connexion", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Indiquez votre adresse e-mail.")).toBeVisible();
    await expect(page.getByText("Indiquez votre mot de passe.")).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Adresse e-mail")).toBeFocused();
  });

  test("affiche une erreur générique si le service ne répond pas", async ({ page }) => {
    await page.goto("/connexion?next=/messages");
    await page.getByLabel("Adresse e-mail").fill("awa@example.cm");
    await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Une erreur est survenue. Veuillez réessayer.")).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue("awa@example.cm");
    await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveValue("");
  });

  test("valide le formulaire d'inscription", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByLabel("Nom affiché").fill("Awa");
    await page.getByLabel("Nom d'utilisateur").fill("admin");
    await page.getByLabel("Adresse e-mail").fill("awa@example.cm");
    await page.getByLabel("Mot de passe", { exact: true }).fill("courtmdp");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Ce nom d'utilisateur est réservé.")).toBeVisible();
    await expect(
      page.getByText("Le mot de passe doit contenir au moins un chiffre."),
    ).toBeVisible();
    await expect(page.getByText("Vous devez accepter les conditions d'utilisation.")).toBeVisible();
    await expect(page.getByLabel("Nom affiché")).toHaveValue("Awa");
  });

  test("signale l'indisponibilité lors d'une demande de réinitialisation", async ({ page }) => {
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Adresse e-mail").fill("awa@example.cm");
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText(/momentanément indisponible/)).toBeVisible();
  });

  test("n'affiche pas de bouton Google non configuré en production", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.getByRole("button", { name: "Continuer avec Google" })).toHaveCount(0);
  });

  test("permet d'afficher le mot de passe saisi", async ({ page }) => {
    await page.goto("/connexion");
    const password = page.getByLabel("Mot de passe", { exact: true });
    await password.fill("secret1");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
    await expect(password).toHaveAttribute("type", "text");
  });

  test("un lien d'e-mail invalide renvoie vers la connexion avec un message", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=abc&type=inconnu");
    await page.getByRole("button", { name: "Confirmer mon adresse" }).click();
    await expect(page).toHaveURL("/connexion?erreur=lien-invalide");
    await expect(page.getByText(/Ce lien est invalide ou a expiré/)).toBeVisible();
  });

  test("le profil public d'un service indisponible affiche la page d'erreur", async ({ page }) => {
    await page.goto("/u/awa");
    await expect(page.getByRole("heading", { name: "Une erreur est survenue" })).toBeVisible();
  });
});
