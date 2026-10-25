import { describe, expect, it } from "vitest";
import { parseTheme, themeColors } from "./theme";

describe("parseTheme", () => {
  it("reconnaît le thème sombre", () => {
    expect(parseTheme("dark")).toBe("dark");
  });

  it("retombe sur le thème clair pour toute autre valeur", () => {
    for (const value of ["light", "", "DARK", "sombre", undefined, null, 1, ["dark"]]) {
      expect(parseTheme(value)).toBe("light");
    }
  });

  it("associe une couleur de barre de navigateur à chaque thème", () => {
    expect(themeColors.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(themeColors.dark).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
