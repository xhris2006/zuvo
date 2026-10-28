import { describe, expect, it } from "vitest";
import { foldText, inlineCompletion, rankTitles } from "./suggestion-text";

describe("foldText", () => {
  it("ignore accents et majuscules", () => {
    expect(foldText("Électroménager Œuf")).toBe("electromenager œuf");
  });
});

describe("inlineCompletion", () => {
  it("complète le mot en cours et le mot suivant", () => {
    expect(inlineCompletion("iph", ["iPhone 12 Pro 128 Go"])).toBe("one 12");
  });

  it("ignore les accents de la saisie comme du titre", () => {
    expect(inlineCompletion("tele", ["Télévision Samsung 43 pouces"])).toBe("vision Samsung");
    expect(inlineCompletion("Télé", ["Television LG"])).toBe("vision LG");
  });

  it("propose le mot suivant après une espace", () => {
    expect(inlineCompletion("robe ", ["Robe en wax taille M"])).toBe("en wax");
  });

  it("prend la première suggestion qui commence par la saisie", () => {
    expect(inlineCompletion("sac", ["Grand sac à dos", "Sac à main cuir"])).toBe(" à");
  });

  it("ne propose rien sans correspondance ou quand le titre est déjà complet", () => {
    expect(inlineCompletion("velo", ["Vélo"])).toBe("");
    expect(inlineCompletion("ordi", ["Chaise"])).toBe("");
    expect(inlineCompletion("  ", ["Chaise"])).toBe("");
  });
});

describe("rankTitles", () => {
  it("retire les doublons et met en tête les titres qui commencent par la saisie", () => {
    expect(
      rankTitles("sac", ["Grand sac", "Sac à main", "sac à  main", "Sac de sport"], 5),
    ).toEqual(["Sac à main", "Sac de sport", "Grand sac"]);
  });

  it("respecte la limite", () => {
    expect(rankTitles("a", ["a1", "a2", "a3"], 2)).toEqual(["a1", "a2"]);
  });
});
