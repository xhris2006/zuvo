import { describe, expect, it } from "vitest";
import { isSuspensionActive, suspensionEnd } from "./suspension";

const now = new Date("2026-10-25T10:00:00Z");

describe("suspensionEnd", () => {
  it("renvoie null pour une suspension sans date de fin", () => {
    expect(suspensionEnd("permanent", "", now)).toEqual({ ok: true, until: null });
  });

  it("ajoute la durée choisie", () => {
    expect(suspensionEnd("1d", "", now)).toEqual({
      ok: true,
      until: new Date("2026-10-26T10:00:00Z"),
    });
    expect(suspensionEnd("30d", "", now)).toEqual({
      ok: true,
      until: new Date("2026-11-24T10:00:00Z"),
    });
  });

  it("va jusqu'à la fin de la journée choisie, heure du Cameroun", () => {
    expect(suspensionEnd("date", "2026-11-01", now)).toEqual({
      ok: true,
      until: new Date("2026-11-01T22:59:00Z"),
    });
  });

  it("refuse une date absente, passée, mal formée ou au-delà d'un an", () => {
    for (const date of ["", "2026-10-24", "01/11/2026", "2027-12-01", "2026-13-45"]) {
      expect(suspensionEnd("date", date, now).ok).toBe(false);
    }
  });

  it("refuse une durée inconnue", () => {
    expect(suspensionEnd("2y", "", now)).toEqual({
      ok: false,
      error: "invalidDuration",
    });
  });
});

describe("isSuspensionActive", () => {
  it("distingue suspension en cours, expirée et absence de suspension", () => {
    expect(isSuspensionActive(null, null, now)).toBe(false);
    expect(isSuspensionActive("2026-10-20T00:00:00Z", null, now)).toBe(true);
    expect(isSuspensionActive("2026-10-20T00:00:00Z", "2026-10-30T00:00:00Z", now)).toBe(true);
    expect(isSuspensionActive("2026-10-20T00:00:00Z", "2026-10-25T09:59:00Z", now)).toBe(false);
  });
});
