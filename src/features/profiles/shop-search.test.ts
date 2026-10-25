import { describe, expect, it } from "vitest";
import { parseExploreTab, SHOP_QUERY_MAX, sanitizeShopQuery, shopQueryTokens } from "./shop-search";

describe("parseExploreTab", () => {
  it("affiche les articles par défaut", () => {
    expect(parseExploreTab(undefined)).toBe("articles");
    expect(parseExploreTab("articles")).toBe("articles");
    expect(parseExploreTab("autre")).toBe("articles");
  });

  it("reconnaît l'onglet boutiques", () => {
    expect(parseExploreTab("boutiques")).toBe("boutiques");
    expect(parseExploreTab(["boutiques"])).toBe("boutiques");
  });
});

describe("sanitizeShopQuery", () => {
  it("garde lettres (accentuées), chiffres, espaces, points et tirets", () => {
    expect(sanitizeShopQuery("  Jean-Paul   Mbarga ")).toBe("Jean-Paul Mbarga");
    expect(sanitizeShopQuery("Hélène.N 237")).toBe("Hélène.N 237");
  });

  it("neutralise les caractères de syntaxe PostgREST et les jokers", () => {
    const cleaned = sanitizeShopQuery('a,b(c)d"e*f%g_h\\i:j');
    expect(cleaned).toBe("a b c d e f g h i j");
    expect(cleaned).not.toMatch(/[,()"*%_\\:]/);
    expect(sanitizeShopQuery("x),id.eq.1,(y")).not.toMatch(/[,()]/);
  });

  it("gère les valeurs vides, multiples ou trop longues", () => {
    expect(sanitizeShopQuery(undefined)).toBe("");
    expect(sanitizeShopQuery("")).toBe("");
    expect(sanitizeShopQuery("()")).toBe("");
    expect(sanitizeShopQuery(["awa", "autre"])).toBe("awa");
    expect(sanitizeShopQuery("a".repeat(200))).toHaveLength(SHOP_QUERY_MAX);
  });
});

describe("shopQueryTokens", () => {
  it("découpe en mots uniques, en minuscules", () => {
    expect(shopQueryTokens("jp_mbarga")).toEqual(["jp", "mbarga"]);
    expect(shopQueryTokens("Awa AWA ndiaye")).toEqual(["awa", "ndiaye"]);
    expect(shopQueryTokens("Jean-Paul")).toEqual(["jean-paul"]);
  });

  it("ignore la ponctuation isolée et limite le nombre de mots", () => {
    expect(shopQueryTokens(". - ,")).toEqual([]);
    expect(shopQueryTokens("a b c d e f")).toEqual(["a", "b", "c", "d"]);
  });
});
