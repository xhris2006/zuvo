import { describe, expect, it } from "vitest";
import { countActiveFilters, parseSearchParams, toSearchParams } from "./schema";

describe("parseSearchParams", () => {
  it("returns defaults for empty params", () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      category: undefined,
      city: undefined,
      condition: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("parses valid values", () => {
    const filters = parseSearchParams({
      q: "  robe wax ",
      category: "mode-femme",
      city: "douala",
      condition: "very_good",
      minPrice: "1000",
      maxPrice: "25000",
      sort: "price_asc",
      page: "3",
    });
    expect(filters).toMatchObject({
      q: "robe wax",
      category: "mode-femme",
      city: "douala",
      condition: "very_good",
      minPrice: 1000,
      maxPrice: 25000,
      sort: "price_asc",
      page: 3,
    });
  });

  it("ignores invalid values individually instead of failing", () => {
    const filters = parseSearchParams({
      q: "chaussures",
      city: "paris",
      condition: "broken",
      minPrice: "-5",
      maxPrice: "abc",
      sort: "random",
      page: "0",
      category: "<script>",
    });
    expect(filters).toEqual({
      q: "chaussures",
      category: undefined,
      city: undefined,
      condition: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("rejects non-integer and excessive prices", () => {
    expect(parseSearchParams({ minPrice: "10.5" }).minPrice).toBeUndefined();
    expect(parseSearchParams({ maxPrice: "999999999999" }).maxPrice).toBeUndefined();
  });

  it("treats empty strings as absent and keeps the first array value", () => {
    const filters = parseSearchParams({ q: "", city: ["yaounde", "douala"], minPrice: "" });
    expect(filters.q).toBeUndefined();
    expect(filters.city).toBe("yaounde");
    expect(filters.minPrice).toBeUndefined();
  });

  it("drops overly long queries", () => {
    expect(parseSearchParams({ q: "a".repeat(101) }).q).toBeUndefined();
  });

  it("swaps an inverted price range", () => {
    const filters = parseSearchParams({ minPrice: "50000", maxPrice: "1000" });
    expect(filters.minPrice).toBe(1000);
    expect(filters.maxPrice).toBe(50000);
  });
});

describe("toSearchParams", () => {
  it("omits defaults and undefined values", () => {
    const params = toSearchParams(parseSearchParams({ q: "sac", city: "buea" }));
    expect(params.toString()).toBe("q=sac&city=buea");
  });

  it("round-trips through parseSearchParams", () => {
    const original = parseSearchParams({
      q: "iphone",
      minPrice: "0",
      sort: "price_desc",
      page: "2",
    });
    const roundTrip = parseSearchParams(Object.fromEntries(toSearchParams(original)));
    expect(roundTrip).toEqual(original);
  });
});

describe("countActiveFilters", () => {
  it("ignores sort and page", () => {
    expect(countActiveFilters(parseSearchParams({ sort: "price_asc", page: "4" }))).toBe(0);
  });

  it("counts a zero minimum price", () => {
    expect(countActiveFilters(parseSearchParams({ minPrice: "0", city: "douala" }))).toBe(2);
  });
});
