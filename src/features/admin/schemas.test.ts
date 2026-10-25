import { describe, expect, it } from "vitest";
import {
  announcementFormSchema,
  antiSpamSettingsSchema,
  normalizeBannedWord,
  categoryFormSchema,
  cityFormSchema,
  parseCameroonDateTime,
  toCameroonDateTimeInput,
} from "./schemas";

describe("dates du Cameroun", () => {
  it("interprète une saisie locale à l'heure du Cameroun (UTC+1)", () => {
    expect(parseCameroonDateTime("2026-11-01T08:30")).toEqual(new Date("2026-11-01T07:30:00Z"));
    expect(parseCameroonDateTime("")).toBeNull();
    expect(parseCameroonDateTime("01/11/2026 08:30")).toBeUndefined();
  });

  it("restitue la valeur du champ à partir d'une date enregistrée", () => {
    expect(toCameroonDateTimeInput("2026-11-01T07:30:00Z")).toBe("2026-11-01T08:30");
    expect(toCameroonDateTimeInput(null)).toBe("");
  });
});

describe("catégories et villes", () => {
  it("déduit l'identifiant du nom s'il est vide", () => {
    expect(categoryFormSchema.parse({ name: " Animaux & jardin ", slug: "" })).toEqual({
      name: "Animaux & jardin",
      slug: "animaux-jardin",
    });
    expect(cityFormSchema.parse({ name: "Mont Fébé", region: "Centre", slug: "" })).toEqual({
      name: "Mont Fébé",
      region: "Centre",
      slug: "mont-febe",
    });
  });

  it("refuse un nom trop court ou un identifiant invalide", () => {
    expect(categoryFormSchema.safeParse({ name: "A", slug: "" }).success).toBe(false);
    expect(categoryFormSchema.safeParse({ name: "!!!", slug: "" }).success).toBe(false);
    expect(cityFormSchema.safeParse({ name: "Kribi", region: "", slug: "kri bi" }).success).toBe(
      false,
    );
  });
});

describe("message global", () => {
  const valid = {
    kind: "maintenance",
    message: "Maintenance ce soir de 22 h à 23 h.",
    linkUrl: "/aide",
    startsAt: "2026-11-01T20:00",
    endsAt: "2026-11-01T23:00",
    isActive: true,
  };

  it("accepte un message avec lien interne et période", () => {
    const parsed = announcementFormSchema.parse(valid);
    expect(parsed.startsAt).toEqual(new Date("2026-11-01T19:00:00Z"));
    expect(parsed.endsAt).toEqual(new Date("2026-11-01T22:00:00Z"));
  });

  it("refuse les liens dangereux et une fin avant le début", () => {
    for (const linkUrl of ["javascript:alert(1)", "//evil.example", "http://exemple.cm"]) {
      expect(announcementFormSchema.safeParse({ ...valid, linkUrl }).success).toBe(false);
    }
    expect(announcementFormSchema.safeParse({ ...valid, endsAt: "2026-11-01T19:00" }).success).toBe(
      false,
    );
  });

  it("accepte l'absence de lien et de dates", () => {
    const parsed = announcementFormSchema.parse({
      ...valid,
      linkUrl: "",
      startsAt: "",
      endsAt: "",
    });
    expect(parsed).toMatchObject({ linkUrl: "", startsAt: null, endsAt: null });
  });
});

describe("anti-spam", () => {
  it("normalise un mot interdit comme en base", () => {
    expect(normalizeBannedWord("  Contrefaçon ")).toBe("contrefacon");
    expect(normalizeBannedWord("Faux  Billets")).toBe("faux billets");
    expect(normalizeBannedWord("anti - vol")).toBe("anti-vol");
    expect(normalizeBannedWord("C'est")).toBe("c est");
  });

  it("refuse un mot vide, trop court ou trop long", () => {
    expect(normalizeBannedWord("!!")).toBeNull();
    expect(normalizeBannedWord("a")).toBeNull();
    expect(normalizeBannedWord("x".repeat(41))).toBeNull();
  });

  it("valide les réglages des nouveaux comptes", () => {
    expect(
      antiSpamSettingsSchema.parse({ newAccountDays: "7", newAccountDailyListings: "5" }),
    ).toEqual({ newAccountDays: 7, newAccountDailyListings: 5 });
    expect(
      antiSpamSettingsSchema.safeParse({ newAccountDays: "-1", newAccountDailyListings: "5" })
        .success,
    ).toBe(false);
    expect(
      antiSpamSettingsSchema.safeParse({ newAccountDays: "7", newAccountDailyListings: "0" })
        .success,
    ).toBe(false);
  });
});
