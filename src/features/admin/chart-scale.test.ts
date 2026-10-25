import { describe, expect, it } from "vitest";
import { barPercent, niceMax } from "./chart-scale";

describe("niceMax", () => {
  it("arrondit au palier 1, 2 ou 5 supérieur", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(1)).toBe(1);
    expect(niceMax(3)).toBe(5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(20)).toBe(20);
    expect(niceMax(430)).toBe(500);
    expect(niceMax(1001)).toBe(2000);
  });

  it("résiste aux valeurs invalides", () => {
    expect(niceMax(Number.NaN)).toBe(1);
    expect(niceMax(-4)).toBe(1);
  });
});

describe("barPercent", () => {
  it("donne la hauteur relative, bornée à 100 %", () => {
    expect(barPercent(5, 10)).toBe(50);
    expect(barPercent(0, 10)).toBe(0);
    expect(barPercent(12, 10)).toBe(100);
    expect(barPercent(3, 0)).toBe(0);
  });
});
