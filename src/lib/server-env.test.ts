import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./server-env";

describe("parseServerEnv", () => {
  it("traite les chaînes vides comme absentes", () => {
    expect(parseServerEnv({ SUPABASE_SERVICE_ROLE_KEY: "", PUSH_WEBHOOK_SECRET: "" })).toEqual({});
  });

  it("refuse les valeurs invalides sans les divulguer", () => {
    const parse = () => parseServerEnv({ PUSH_WEBHOOK_SECRET: "trop-court", VAPID_SUBJECT: "x" });
    expect(parse).toThrow(/PUSH_WEBHOOK_SECRET/);
    expect(parse).toThrow(/VAPID_SUBJECT/);
    expect(parse).not.toThrow(/trop-court/);
  });

  it("accepte un sujet VAPID mailto: ou https:", () => {
    expect(parseServerEnv({ VAPID_SUBJECT: "mailto:contact@example.cm" }).VAPID_SUBJECT).toBe(
      "mailto:contact@example.cm",
    );
    expect(parseServerEnv({ VAPID_SUBJECT: "https://example.cm" }).VAPID_SUBJECT).toBe(
      "https://example.cm",
    );
  });
});
