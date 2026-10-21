import { describe, expect, it } from "vitest";
import { dayKey, formatDayLabel, formatInboxTime, formatMessageTime } from "./format";

describe("formats de la messagerie (heure de Douala)", () => {
  const now = new Date("2026-10-18T10:00:00Z");

  it("affiche l'heure locale", () => {
    expect(formatMessageTime("2026-10-18T08:05:00Z")).toBe("09:05");
  });

  it("étiquette les jours relatifs", () => {
    expect(formatDayLabel("2026-10-18T07:00:00Z", now)).toBe("Aujourd'hui");
    expect(formatDayLabel("2026-10-17T07:00:00Z", now)).toBe("Hier");
    expect(formatDayLabel("2026-10-14T07:00:00Z", now)).toBe("Mercredi 14 octobre");
  });

  it("affiche une date compacte dans la liste des conversations", () => {
    expect(formatInboxTime("2026-10-18T08:05:00Z", now)).toBe("09:05");
    expect(formatInboxTime("2026-10-17T08:05:00Z", now)).toBe("Hier");
    expect(formatInboxTime("2026-10-14T08:05:00Z", now)).toBe("mer.");
    expect(formatInboxTime("2026-10-03T08:05:00Z", now)).toBe("03/10");
  });

  it("calcule le jour dans le fuseau du site", () => {
    // 23 h 30 UTC = 0 h 30 le lendemain à Douala (UTC+1).
    expect(dayKey("2026-10-17T23:30:00Z")).toBe("2026-10-18");
  });
});
