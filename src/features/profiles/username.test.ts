import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isReservedUsername, normalizeUsername, reservedUsernames } from "./username";

describe("noms d'utilisateur", () => {
  it("reprennent exactement la liste réservée définie en SQL", () => {
    const dir = path.resolve(__dirname, "../../../supabase/migrations");
    // Dernière migration qui (re)définit la fonction : c'est elle qui s'applique.
    const sql = readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => readFileSync(path.join(dir, name), "utf8"))
      .filter((content) => /function private\.is_reserved_username/.test(content))
      .at(-1)!;
    const block = sql.match(/is_reserved_username[\s\S]*?array\[([\s\S]*?)\]/);
    const fromSql = [...block![1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect([...reservedUsernames].sort()).toEqual(fromSql.sort());
  });

  it("normalise la saisie", () => {
    expect(normalizeUsername("  @Awa_237 ")).toBe("awa_237");
  });

  it("détecte les noms réservés sans tenir compte de la casse", () => {
    expect(isReservedUsername("Admin")).toBe(true);
    expect(isReservedUsername("MboaDeal")).toBe(true);
    expect(isReservedUsername("awa")).toBe(false);
  });
});
