import { describe, expect, it } from "vitest";
import { reportSchema } from "./schemas";

const TARGET = "4f1c2a3b-0000-4000-8000-0000000000aa";

describe("reportSchema", () => {
  it("accepte un signalement valide et normalise les détails", () => {
    expect(
      reportSchema.parse({
        targetType: "listing",
        targetId: TARGET,
        reason: "scam",
        details: "  ",
      }),
    ).toEqual({ targetType: "listing", targetId: TARGET, reason: "scam", details: null });
  });

  it("refuse un motif inadapté à la cible", () => {
    const result = reportSchema.safeParse({
      targetType: "message",
      targetId: TARGET,
      reason: "counterfeit",
      details: "",
    });
    expect(result.error?.issues[0]?.path).toEqual(["reason"]);
  });

  it("exige des précisions pour « Autre motif »", () => {
    const result = reportSchema.safeParse({
      targetType: "user",
      targetId: TARGET,
      reason: "other",
      details: "",
    });
    expect(result.error?.issues[0]?.path).toEqual(["details"]);
  });

  it("refuse une cible ou un type inconnus", () => {
    expect(
      reportSchema.safeParse({ targetType: "admin", targetId: TARGET, reason: "spam", details: "" })
        .success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({ targetType: "user", targetId: "1", reason: "spam", details: "" })
        .success,
    ).toBe(false);
  });
});
