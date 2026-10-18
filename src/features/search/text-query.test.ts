import { describe, expect, it } from "vitest";
import { buildPrefixTsQuery } from "./text-query";

describe("buildPrefixTsQuery", () => {
  it("transforme chaque mot en préfixe obligatoire", () => {
    expect(buildPrefixTsQuery("Robe  wax")).toBe("robe:* & wax:*");
    expect(buildPrefixTsQuery("iPhone 12")).toBe("iphone:* & 12:*");
  });

  it("conserve les lettres accentuées", () => {
    expect(buildPrefixTsQuery("Téléphone écran")).toBe("téléphone:* & écran:*");
  });

  it("neutralise la syntaxe tsquery", () => {
    expect(buildPrefixTsQuery("robe & !wax | (x:*)")).toBe("robe:* & wax:* & x:*");
    expect(buildPrefixTsQuery("'); drop table listings; --")).toBe("drop:* & table:* & listings:*");
  });

  it("ignore une saisie sans mot", () => {
    expect(buildPrefixTsQuery("  !!  ")).toBeNull();
  });

  it("limite le nombre et la longueur des mots", () => {
    const query = buildPrefixTsQuery(`${"a".repeat(60)} ${"b ".repeat(20)}`)!;
    expect(query.split(" & ")).toHaveLength(8);
    expect(query.startsWith(`${"a".repeat(40)}:*`)).toBe(true);
  });
});
