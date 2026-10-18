import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Le paquet server-only refuse d'être importé hors du rendu serveur de Next.js.
vi.mock("server-only", () => ({}));
