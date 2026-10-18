import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("accepte les chemins internes avec paramètres", () => {
    expect(safeRedirectPath("/messages")).toBe("/messages");
    expect(safeRedirectPath("/explorer?q=robe&city=douala")).toBe("/explorer?q=robe&city=douala");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/\r\nSet-Cookie:x",
    "/messages\u0000",
    "",
    "messages",
    // Chemins que la normalisation transformerait en « //evil.example ».
    "/.//evil.example",
    "/%2e//evil.example",
    "/a/..//evil.example",
    "/./%2e//evil.example",
  ])("rejette %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });

  it("conserve encodés les retours à la ligne encodés (aucune injection d'en-tête)", () => {
    const result = safeRedirectPath("/%0d%0aSet-Cookie:x");
    expect(result).not.toMatch(/[\r\n]/);
  });

  it("rejette les valeurs non textuelles et trop longues", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath(["/messages"])).toBe("/");
    expect(safeRedirectPath(`/${"a".repeat(600)}`)).toBe("/");
  });

  it("évite les boucles vers les pages d'authentification", () => {
    expect(safeRedirectPath("/connexion?next=/connexion")).toBe("/");
    expect(safeRedirectPath("/auth/callback?code=x")).toBe("/");
  });

  it("utilise la destination de repli fournie", () => {
    expect(safeRedirectPath("https://evil.example", "/profil")).toBe("/profil");
  });
});
