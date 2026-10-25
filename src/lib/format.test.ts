import { describe, expect, it } from "vitest";
import { formatDateTime, formatDayMonth, formatPrice, formatRelativeTime } from "./format";

/** Intl utilise des espaces insécables ; on les normalise pour les assertions. */
const normalize = (value: string) => value.replace(/[  ]/g, " ");

describe("formatPrice", () => {
  it("utilise des espaces insécables visibles (pas d'espace fine)", () => {
    expect(formatPrice(15000)).toBe("15\u00a0000\u00a0FCFA");
  });

  it("formats XAF amounts without decimals", () => {
    expect(normalize(formatPrice(15000))).toBe("15 000 FCFA");
    expect(normalize(formatPrice(0))).toBe("0 FCFA");
    expect(normalize(formatPrice(1250000))).toBe("1 250 000 FCFA");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("returns « à l'instant » under a minute", () => {
    expect(formatRelativeTime(new Date("2026-06-15T11:59:30Z"), now)).toBe("à l'instant");
  });

  it("formats hours and days in French", () => {
    expect(formatRelativeTime(new Date("2026-06-15T09:00:00Z"), now)).toBe("il y a 3 heures");
    expect(formatRelativeTime(new Date("2026-06-14T12:00:00Z"), now)).toBe("hier");
  });

  it("accepts ISO strings", () => {
    expect(formatRelativeTime("2026-06-01T12:00:00Z", now)).toBe("il y a 2 semaines");
  });
});

describe("formatMonthYear et formatCount", () => {
  it("formatent en français", async () => {
    const { formatCount, formatMonthYear } = await import("./format");
    expect(formatMonthYear("2026-10-18T12:00:00Z")).toBe("octobre 2026");
    expect(formatCount(42)).toBe("42");
    expect(normalize(formatCount(1200))).toBe("1,2 k");
  });
});

describe("formatDateTime", () => {
  it("affiche la date et l'heure du Cameroun", () => {
    expect(formatDateTime("2026-10-18T13:05:00Z")).toBe("18 oct. 2026, 14:05");
  });
});

describe("formatDayMonth", () => {
  it("affiche le jour et le mois abrégé, sans décalage horaire", () => {
    expect(formatDayMonth("2026-10-25")).toBe("25 oct.");
    expect(formatDayMonth("2026-01-01")).toBe("1 janv.");
  });
});
