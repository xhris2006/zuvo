import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

// Permet d'intercepter les requêtes émises par le service worker (test hors connexion).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= "1";
const baseURL = `http://localhost:${port}`;

// Permet d'utiliser un Chromium déjà installé (ex. environnements cloud)
// au lieu de celui téléchargé par `npx playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    // channel « chromium » : vrai Chromium en mode headless (et non le
    // « headless shell »), nécessaire au test du service worker hors connexion.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chromium", launchOptions: { executablePath } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chromium", launchOptions: { executablePath } },
    },
  ],
  webServer: {
    // Nécessite un build préalable (`npm run build`), voir le script test:e2e.
    command: `npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
