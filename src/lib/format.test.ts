import { describe, expect, it } from "vitest";
import { createFormatters } from "./format";

/** Intl utilise des espaces insécables ; on les normalise pour les assertions. */
const normalize = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

const fr = createFormatters("fr-CM", "à l'instant");
const en = createFormatters("en-CM", "just now");

describe("price", () => {
  it("utilise des espaces insécables visibles (pas d'espace fine)", () => {
    expect(fr.price(15000)).toBe("15 000 FCFA");
  });

  it("formats XAF amounts without decimals", () => {
    expect(normalize(fr.price(15000))).toBe("15 000 FCFA");
    expect(normalize(fr.price(0))).toBe("0 FCFA");
    expect(normalize(fr.price(1250000))).toBe("1 250 000 FCFA");
  });

  it("formate aussi en anglais", () => {
    expect(normalize(en.price(15000))).toBe("FCFA 15,000");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("returns « à l'instant » under a minute", () => {
    expect(fr.relativeTime(new Date("2026-06-15T11:59:30Z"), now)).toBe("à l'instant");
    expect(en.relativeTime(new Date("2026-06-15T11:59:30Z"), now)).toBe("just now");
  });

  it("formats hours and days in French", () => {
    expect(fr.relativeTime(new Date("2026-06-15T09:00:00Z"), now)).toBe("il y a 3 heures");
    expect(fr.relativeTime(new Date("2026-06-14T12:00:00Z"), now)).toBe("hier");
  });

  it("formats hours and days in English", () => {
    expect(en.relativeTime(new Date("2026-06-15T09:00:00Z"), now)).toBe("3 hours ago");
    expect(en.relativeTime(new Date("2026-06-14T12:00:00Z"), now)).toBe("yesterday");
  });

  it("accepts ISO strings", () => {
    expect(fr.relativeTime("2026-06-01T12:00:00Z", now)).toBe("il y a 2 semaines");
  });
});

describe("monthYear et count", () => {
  it("formatent en français", () => {
    expect(fr.monthYear("2026-10-18T12:00:00Z")).toBe("octobre 2026");
    expect(fr.count(42)).toBe("42");
    expect(normalize(fr.count(1200))).toBe("1,2 k");
  });

  it("formatent en anglais", () => {
    expect(en.monthYear("2026-10-18T12:00:00Z")).toBe("October 2026");
    expect(en.count(1200)).toBe("1.2K");
  });
});

describe("dateTime", () => {
  it("affiche la date et l'heure du Cameroun", () => {
    expect(fr.dateTime("2026-10-18T13:05:00Z")).toBe("18 oct. 2026, 14:05");
  });
});

describe("dayMonth", () => {
  it("affiche le jour et le mois abrégé, sans décalage horaire", () => {
    expect(fr.dayMonth("2026-10-25")).toBe("25 oct.");
    expect(fr.dayMonth("2026-01-01")).toBe("1 janv.");
    expect(en.dayMonth("2026-10-25")).toBe("25 Oct");
  });
});

describe("number", () => {
  it("sépare les milliers selon la langue", () => {
    expect(normalize(fr.number(12500))).toBe("12 500");
    expect(en.number(12500)).toBe("12,500");
  });
});
