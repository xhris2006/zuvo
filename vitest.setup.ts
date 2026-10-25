import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Le paquet server-only refuse d'être importé hors du rendu serveur de Next.js.
vi.mock("server-only", () => ({}));

// L'envoi push (planifié avec after(), propre aux requêtes Next.js) est
// couvert par les tests d'intégration (supabase/tests/api/push.api.test.ts).
vi.mock("@/features/notifications/push/schedule", () => ({ schedulePushDispatch: vi.fn() }));

// La langue vient d'un cookie de la requête (next/headers) : les tests
// s'exécutent en français, la langue par défaut.
vi.mock("@/i18n/server", async () => {
  const { getServerDictionary } = await import("@/i18n/server-dictionaries");
  return {
    getLocale: async () => "fr",
    getT: async () => getServerDictionary("fr"),
  };
});
