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
