import { describe, expect, it } from "vitest";
import { isGuestOnlyPath, isProtectedPath, publicProfileHref } from "./routes";

describe("routes protégées", () => {
  it.each(["/vendre", "/messages", "/messages/abc", "/profil", "/profil/modifier", "/parametres"])(
    "protège %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it.each(["/", "/explorer", "/u/awa", "/profilage", "/connexion", "/auth/confirm"])(
    "laisse %s public",
    (path) => {
      expect(isProtectedPath(path)).toBe(false);
    },
  );

  it("identifie les pages réservées aux visiteurs non connectés", () => {
    expect(isGuestOnlyPath("/connexion")).toBe(true);
    expect(isGuestOnlyPath("/inscription/verification")).toBe(false);
  });

  it("encode le nom d'utilisateur dans l'URL du profil", () => {
    expect(publicProfileHref("awa_237")).toBe("/u/awa_237");
  });
});
