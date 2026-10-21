import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests d'intégration : fonctions de l'application exécutées contre un vrai
 * PostgREST et la base issue des migrations (voir supabase/tests/api).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/api/**/*.test.ts"],
    globalSetup: ["./supabase/tests/api/support/global-setup.ts"],
    setupFiles: ["./supabase/tests/api/support/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
