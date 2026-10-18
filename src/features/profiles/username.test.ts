import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isReservedUsername, normalizeUsername, reservedUsernames } from "./username";

describe("noms d'utilisateur", () => {
  it("reprennent exactement la liste réservée définie en SQL", () => {
    const dir = path.resolve(__dirname, "../../../supabase/migrations");
    const file = readdirSync(dir).find((name) => name.endsWith("_foundations.sql"));
    const sql = readFileSync(path.join(dir, file!), "utf8");
    const block = sql.match(/is_reserved_username[\s\S]*?array\[([\s\S]*?)\]/);
    const fromSql = [...block![1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect([...reservedUsernames].sort()).toEqual(fromSql.sort());
  });

  it("normalise la saisie", () => {
    expect(normalizeUsername("  @Awa_237 ")).toBe("awa_237");
  });

  it("détecte les noms réservés sans tenir compte de la casse", () => {
    expect(isReservedUsername("Admin")).toBe(true);
    expect(isReservedUsername("awa")).toBe(false);
  });
});
