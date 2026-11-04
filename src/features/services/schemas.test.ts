import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { translateValidation } from "@/lib/forms/validation";
import { defaultServiceCategories } from "./categories";
import { servicePriceLabel } from "./format";
import {
  countServiceFilters,
  parseServiceSearchParams,
  serviceFieldsSchema,
  serviceImagesSchema,
  serviceSearchParams,
} from "./schemas";
import { spaceOf } from "./space";

const fr = getDictionary("fr");
const en = getDictionary("en");

const validFields = {
  title: "Cours de maths à domicile",
  category: "education-formation",
  description: "Cours particuliers du CM2 à la terminale, méthode et exercices corrigés.",
  city: "douala",
  district: "Akwa",
  pricingType: "hourly",
  price: "5 000",
  availability: "weekends",
  availabilityNote: "",
  extraInfo: "",
  contactPhone: "",
  whatsapp: false,
};

function firstMessage(input: Record<string, unknown>, field: string) {
  const result = serviceFieldsSchema.safeParse(input);
  if (result.success) return undefined;
  const issue = result.error.issues.find((item) => item.path[0] === field);
  return issue ? translateValidation(issue.message, fr.validation) : undefined;
}

describe("serviceFieldsSchema", () => {
  it("accepts a complete service and normalises its values", () => {
    const result = serviceFieldsSchema.parse(validFields);
    expect(result).toMatchObject({
      title: "Cours de maths à domicile",
      district: "Akwa",
      price: 5000,
      pricingType: "hourly",
      availabilityNote: null,
      extraInfo: null,
      contactPhone: null,
      whatsapp: false,
    });
  });

  it("requires a price unless the service is on quote", () => {
    expect(firstMessage({ ...validFields, price: "" }, "price")).toBeTruthy();
    const quote = serviceFieldsSchema.parse({ ...validFields, pricingType: "quote", price: "" });
    expect(quote.price).toBeNull();
  });

  it("drops the price of a service on quote", () => {
    const quote = serviceFieldsSchema.parse({
      ...validFields,
      pricingType: "quote",
      price: "20000",
    });
    expect(quote.price).toBeNull();
  });

  it("rejects prices that are not whole numbers", () => {
    expect(firstMessage({ ...validFields, price: "12,5" }, "price")).toBeTruthy();
    expect(firstMessage({ ...validFields, price: "-100" }, "price")).toBeTruthy();
    expect(firstMessage({ ...validFields, price: "1000000000" }, "price")).toBeTruthy();
  });

  it("rejects unknown pricing types and availabilities", () => {
    expect(firstMessage({ ...validFields, pricingType: "monthly" }, "pricingType")).toBe(
      fr.validation.pricingInvalid,
    );
    expect(firstMessage({ ...validFields, availability: "always" }, "availability")).toBe(
      fr.validation.availabilityInvalid,
    );
  });

  it("requires a description long enough to be useful", () => {
    expect(firstMessage({ ...validFields, description: "Trop court" }, "description")).toBeTruthy();
  });

  it("validates the city slug format", () => {
    expect(firstMessage({ ...validFields, city: "Douala!" }, "city")).toBeTruthy();
  });

  it("normalises the public phone and only keeps WhatsApp with a number", () => {
    const withPhone = serviceFieldsSchema.parse({
      ...validFields,
      contactPhone: "6 90 12 34 56",
      whatsapp: true,
    });
    expect(withPhone.contactPhone).toBe("+237690123456");
    expect(withPhone.whatsapp).toBe(true);

    const withoutPhone = serviceFieldsSchema.parse({ ...validFields, whatsapp: true });
    expect(withoutPhone.whatsapp).toBe(false);

    expect(firstMessage({ ...validFields, contactPhone: "12" }, "contactPhone")).toBeTruthy();
  });
});

describe("serviceImagesSchema", () => {
  const uid = "8f9c2a3e-1b2c-4d5e-8f90-1234567890ab";
  const serviceId = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

  it("accepts kept photos and new uploads in the user's folder format", () => {
    expect(
      serviceImagesSchema.safeParse([{ id: serviceId }, { path: `${uid}/${serviceId}/a.webp` }])
        .success,
    ).toBe(true);
  });

  it("rejects paths outside the expected format and more than 8 photos", () => {
    expect(serviceImagesSchema.safeParse([{ path: "../secret.webp" }]).success).toBe(false);
    expect(
      serviceImagesSchema.safeParse([{ path: `${uid}/${serviceId}/a.webp`, id: serviceId }])
        .success,
    ).toBe(false);
    expect(
      serviceImagesSchema.safeParse(Array.from({ length: 9 }, () => ({ id: serviceId }))).success,
    ).toBe(false);
  });
});

describe("parseServiceSearchParams", () => {
  it("returns defaults for empty params", () => {
    expect(parseServiceSearchParams({})).toEqual({
      q: undefined,
      category: undefined,
      city: undefined,
      district: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      pricing: undefined,
      availability: undefined,
      recent: undefined,
      sort: "recent",
      page: 1,
    });
  });

  it("parses the French URL parameters", () => {
    const filters = parseServiceSearchParams({
      q: "  plombier ",
      categorie: "batiment-travaux",
      ville: "yaounde",
      quartier: "Bastos",
      min: "5000",
      max: "50000",
      tarif: "from",
      dispo: "immediate",
      recent: "7",
      tri: "price_asc",
      page: "2",
    });
    expect(filters).toEqual({
      q: "plombier",
      category: "batiment-travaux",
      city: "yaounde",
      district: "Bastos",
      minPrice: 5000,
      maxPrice: 50000,
      pricing: "from",
      availability: "immediate",
      recent: 7,
      sort: "price_asc",
      page: 2,
    });
    expect(countServiceFilters(filters)).toBe(8);
  });

  it("ignores invalid values and swaps an inverted price range", () => {
    const filters = parseServiceSearchParams({
      categorie: "Pas un slug",
      ville: "<script>",
      min: "90000",
      max: "1000",
      tarif: "monthly",
      dispo: "never",
      recent: "3",
      tri: "random",
      page: "-4",
    });
    expect(filters).toMatchObject({
      category: undefined,
      city: undefined,
      minPrice: 1000,
      maxPrice: 90000,
      pricing: undefined,
      availability: undefined,
      recent: undefined,
      sort: "recent",
      page: 1,
    });
  });

  it("neutralises LIKE wildcards in free text", () => {
    expect(parseServiceSearchParams({ q: "100%_coiffure\\" }).q).toBe("100  coiffure");
  });

  it("round-trips through serviceSearchParams without default values", () => {
    const params = serviceSearchParams({ category: "graphisme-design", sort: "recent", page: 1 });
    expect(params.toString()).toBe("categorie=graphisme-design");
    const filters = parseServiceSearchParams(Object.fromEntries(params));
    expect(filters.category).toBe("graphisme-design");
  });
});

describe("servicePriceLabel", () => {
  it("formats each pricing type", () => {
    expect(servicePriceLabel(fr, "quote", null)).toBe("Sur devis");
    expect(servicePriceLabel(fr, "from", 10000)).toBe(`À partir de ${fr.format.price(10000)}`);
    expect(servicePriceLabel(fr, "hourly", 2500)).toBe(`${fr.format.price(2500)} / heure`);
    expect(servicePriceLabel(en, "daily", 15000)).toContain(en.format.price(15000));
  });

  it("falls back to « on quote » when no price is set", () => {
    expect(servicePriceLabel(fr, "fixed", null)).toBe("Sur devis");
  });
});

describe("service categories", () => {
  it("provides 11 categories with unique slugs and an English name for each", () => {
    expect(defaultServiceCategories).toHaveLength(11);
    const slugs = defaultServiceCategories.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(en.serviceCategoryNames[slug as keyof typeof en.serviceCategoryNames]).toBeTruthy();
    }
  });
});

describe("spaceOf", () => {
  it("detects the services space from the path", () => {
    expect(spaceOf("/services")).toBe("services");
    expect(spaceOf("/services/recherche")).toBe("services");
    expect(spaceOf("/services-pro")).toBe("marketplace");
    expect(spaceOf("/explorer")).toBe("marketplace");
    expect(spaceOf("/")).toBe("marketplace");
  });
});
