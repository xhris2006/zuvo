import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./server-env";

describe("parseServerEnv", () => {
  it("traite les chaînes vides comme absentes", () => {
    expect(parseServerEnv({ SUPABASE_SERVICE_ROLE_KEY: "", VAPID_PRIVATE_KEY: " " })).toEqual({
      env: {},
      invalid: [],
    });
  });

  it("signale les valeurs invalides sans les divulguer ni bloquer les autres", () => {
    const result = parseServerEnv({
      VAPID_PRIVATE_KEY: "trop-court",
      VAPID_SUBJECT: "x",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_0123456789abcdefghij",
    });
    expect(result.invalid).toEqual(["VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]);
    expect(result.env).toEqual({ SUPABASE_SERVICE_ROLE_KEY: "sb_secret_0123456789abcdefghij" });
    expect(JSON.stringify(result)).not.toContain("trop-court");
  });

  it("accepte un sujet VAPID mailto: ou https:", () => {
    expect(parseServerEnv({ VAPID_SUBJECT: "mailto:contact@example.cm" }).env.VAPID_SUBJECT).toBe(
      "mailto:contact@example.cm",
    );
    expect(parseServerEnv({ VAPID_SUBJECT: "https://example.cm" }).env.VAPID_SUBJECT).toBe(
      "https://example.cm",
    );
  });

  it("corrige les erreurs de copier-coller courantes", () => {
    const key = "A".repeat(43);
    const { env, invalid } = parseServerEnv({
      VAPID_PRIVATE_KEY: ` "${key}"\n`,
      VAPID_SUBJECT: "contact@example.cm",
    });
    expect(invalid).toEqual([]);
    expect(env).toEqual({ VAPID_PRIVATE_KEY: key, VAPID_SUBJECT: "mailto:contact@example.cm" });
  });
});
