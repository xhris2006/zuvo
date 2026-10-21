import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Tests de la base de données (schéma, RLS, Storage) sur PostgreSQL. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    // Les tests d'API ont leur propre configuration (vitest.api.config.mts).
    exclude: ["supabase/tests/api/**"],
    globalSetup: ["./supabase/tests/support/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
