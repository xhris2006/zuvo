import { describe, expect, it } from "vitest";
import { parseListingView } from "./listing-view";

describe("parseListingView", () => {
  it("affiche le fil par défaut", () => {
    expect(parseListingView(undefined)).toBe("fil");
    expect(parseListingView("")).toBe("fil");
    expect(parseListingView("fil")).toBe("fil");
  });

  it("reconnaît la grille", () => {
    expect(parseListingView("grille")).toBe("grille");
    expect(parseListingView(["grille", "fil"])).toBe("grille");
  });

  it("ignore les valeurs inconnues ou mal écrites", () => {
    expect(parseListingView("GRILLE")).toBe("fil");
    expect(parseListingView("grid")).toBe("fil");
    expect(parseListingView(["autre"])).toBe("fil");
    expect(parseListingView([])).toBe("fil");
  });
});
