import { describe, expect, it } from "vitest";
import { getSiteUrl, isSupabaseConfigured, parsePublicEnv } from "./env";

describe("parsePublicEnv", () => {
  it("treats empty strings as missing", () => {
    const env = parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_CONTACT_EMAIL: "" });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_CONTACT_EMAIL).toBeUndefined();
  });

  it("rejects malformed values without leaking them", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).not.toThrow(
      /not-a-url/,
    );
  });
});

describe("isSupabaseConfigured", () => {
  it("requires both the URL and the publishable key", () => {
    expect(isSupabaseConfigured(parsePublicEnv({}))).toBe(false);
    expect(
      isSupabaseConfigured(
        parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }),
      ),
    ).toBe(false);
    expect(
      isSupabaseConfigured(
        parsePublicEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "placeholder",
        }),
      ),
    ).toBe(true);
  });
});

describe("getSiteUrl", () => {
  it("strips trailing slashes from the explicit URL", () => {
    expect(getSiteUrl(parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "https://zuvo.example/" }))).toBe(
      "https://zuvo.example",
    );
  });
});
