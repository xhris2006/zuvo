import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { translateValidation } from "@/lib/forms/validation";
import { listingFieldsSchema, listingImagesSchema, publicationErrors } from "./schemas";

/** Message de validation traduit en français (les schémas produisent des codes). */
const text = (message?: string) =>
  message === undefined ? undefined : translateValidation(message, getDictionary("fr").validation);

const base = {
  title: "  Robe en wax  ",
  description: "Portée deux fois, très bon état.",
  category: "mode-femme",
  condition: "very_good",
  price: "15 000",
  city: "douala",
};

describe("listingFieldsSchema", () => {
  it("normalise les champs", () => {
    expect(listingFieldsSchema.parse(base)).toEqual({
      ...base,
      title: "Robe en wax",
      price: 15000,
    });
  });

  it("accepte un brouillon incomplet", () => {
    const draft = listingFieldsSchema.parse({
      title: "Robe",
      description: "",
      category: "",
      condition: "",
      price: "",
      city: "",
    });
    expect(draft).toMatchObject({ category: null, condition: null, price: null, city: null });
    expect(Object.keys(publicationErrors(draft))).toEqual([
      "description",
      "category",
      "condition",
      "price",
      "city",
    ]);
  });

  it.each([
    ["price", "15,50", "Indiquez un prix en chiffres, sans centimes."],
    ["price", "-5", "Indiquez un prix en chiffres, sans centimes."],
    ["price", "200000000", "Prix trop élevé."],
    ["title", "ab", "Au moins 3 caractères."],
    ["condition", "cassé", "État invalide."],
    ["city", "Paris !", "Ville invalide."],
  ])("refuse %s = %j", (field, value, message) => {
    const result = listingFieldsSchema.safeParse({ ...base, [field]: value });
    expect(text(result.error?.issues[0]?.message)).toBe(message);
  });

  it("n'exige rien de plus pour publier une annonce complète", () => {
    expect(publicationErrors(listingFieldsSchema.parse(base))).toEqual({});
  });
});

describe("listingImagesSchema", () => {
  const uid = "4f1c2a3b-0000-4000-8000-000000000001";
  const lid = "4f1c2a3b-0000-4000-8000-000000000002";

  it("accepte des photos existantes et nouvelles", () => {
    expect(
      listingImagesSchema.safeParse([{ id: uid }, { path: `${uid}/${lid}/photo.webp` }]).success,
    ).toBe(true);
  });

  it.each([
    [[{ path: `${uid}/${lid}/../x.webp` }]],
    [[{ path: "autre/chemin.webp" }]],
    [[{ id: "pas-un-uuid" }]],
    [[{ id: uid, path: `${uid}/${lid}/a.webp` }]],
    [Array.from({ length: 9 }, () => ({ id: uid }))],
  ])("refuse %j", (images) => {
    expect(listingImagesSchema.safeParse(images).success).toBe(false);
  });
});
