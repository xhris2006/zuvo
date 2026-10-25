import { describe, expect, it } from "vitest";
import { formatSupportPhone, siteConfig } from "./site";

describe("numéro de l'assistance", () => {
  it("est au format international et s'affiche lisiblement", () => {
    expect(siteConfig.supportPhone).toMatch(/^\+237\d{9}$/);
    expect(formatSupportPhone("+237694600007")).toBe("+237 6 94 60 00 07");
    expect(formatSupportPhone("+33123")).toBe("+33123");
  });
});
