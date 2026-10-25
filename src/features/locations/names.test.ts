import { describe, expect, it } from "vitest";
import { CITY_SLUG_PATTERN, cityNameFrom, slugify } from "./names";

describe("slugify", () => {
  it("produit un identifiant sans accents ni espaces", () => {
    expect(slugify("Édéa")).toBe("edea");
    expect(slugify("Mont Fébé")).toBe("mont-febe");
    expect(slugify("  TV, audio & photo ")).toBe("tv-audio-photo");
    expect(slugify("Ngaoundéré")).toBe("ngaoundere");
  });

  it("respecte le format des identifiants en base", () => {
    for (const name of ["Kousséri", "Sport & loisirs", "Bébé — 0/3 ans", "x".repeat(80)]) {
      expect(slugify(name)).toMatch(CITY_SLUG_PATTERN);
    }
    expect(slugify("a-".repeat(40))).not.toMatch(/-$/);
  });

  it("renvoie une chaîne vide sans lettre ni chiffre", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("cityNameFrom", () => {
  const names = new Map([["douala", "Douala"]]);

  it("donne le nom connu, sinon l'identifiant", () => {
    expect(cityNameFrom("douala", names)).toBe("Douala");
    expect(cityNameFrom("lolodorf", names)).toBe("lolodorf");
  });

  it("renvoie null sans ville", () => {
    expect(cityNameFrom(null, names)).toBeNull();
    expect(cityNameFrom("", names)).toBeNull();
  });
});
