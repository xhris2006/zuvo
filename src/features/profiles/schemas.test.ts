import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "./phone";
import { isOwnAvatarPath, privateContactSchema, profileSchema } from "./schemas";

describe("normalizePhone", () => {
  it.each([
    ["690000000", "+237690000000"],
    ["6 90 00 00 00", "+237690000000"],
    ["690-00-00-00", "+237690000000"],
    ["237690000000", "+237690000000"],
    ["00237690000000", "+237690000000"],
    ["+237 690 00 00 00", "+237690000000"],
    ["222 23 45 67", "+237222234567"],
    ["+33 6 12 34 56 78", "+33612345678"],
  ])("normalise %j", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["12345", "abc", "+0123456789", "7900000000000000000"])("rejette %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("formate les numéros camerounais pour l'affichage", () => {
    expect(formatPhone("+237690000000")).toBe("+237 6 90 00 00 00");
    expect(formatPhone("+33612345678")).toBe("+33612345678");
  });
});

describe("privateContactSchema", () => {
  it("accepte un champ vide (suppression du numéro)", () => {
    expect(privateContactSchema.parse({ phone: "  " })).toEqual({ phone: null });
  });

  it("explique le format attendu en cas d'erreur", () => {
    const result = privateContactSchema.safeParse({ phone: "123" });
    expect(result.error?.issues[0]?.message).toMatch(/Numéro invalide/);
  });
});

describe("profileSchema", () => {
  const base = { username: "awa", displayName: "Awa", bio: "", city: "", avatarPath: "" };

  it("convertit les champs facultatifs vides en null", () => {
    expect(profileSchema.parse(base)).toEqual({ ...base, bio: null, city: null });
  });

  it("refuse une ville inconnue et une bio trop longue", () => {
    expect(profileSchema.safeParse({ ...base, city: "paris" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, bio: "a".repeat(501) }).success).toBe(false);
  });
});

describe("isOwnAvatarPath", () => {
  const userId = "4f1c2a3b-0000-4000-8000-000000000001";

  it("accepte un fichier du dossier de l'utilisateur", () => {
    expect(isOwnAvatarPath(userId, `${userId}/photo.webp`)).toBe(true);
  });

  it.each([
    "autre-utilisateur/photo.webp",
    `${userId}/sous/dossier.webp`,
    `${userId}/`,
    `${userId}/../evil.webp`,
    `${userId}/a b.webp`,
    `${userId}/..`,
    `${userId}/.hidden`,
  ])("refuse %j", (path) => {
    expect(isOwnAvatarPath(userId, path)).toBe(false);
  });
});
