import { describe, expect, it } from "vitest";
import { getPublicSiteUrl, getSiteUrl, isSupabaseConfigured, parsePublicEnv } from "./env";

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

describe("getPublicSiteUrl", () => {
  const stale = parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "https://zuvo-beta.vercel.app" });

  it("uses the official domain on a Vercel production deployment, whatever the configured URL", () => {
    expect(getPublicSiteUrl(stale, "production")).toBe("https://mboadeals.shop");
    expect(getPublicSiteUrl(parsePublicEnv({}), "production")).toBe("https://mboadeals.shop");
  });

  it("keeps the configured URL for previews and local runs", () => {
    expect(getPublicSiteUrl(stale, "preview")).toBe("https://zuvo-beta.vercel.app");
    expect(
      getPublicSiteUrl(
        parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000/" }),
        undefined,
      ),
    ).toBe("http://localhost:3000");
  });
});

describe("parsePublicEnv (formats)", () => {
  it("n'accepte que des URL http(s), une adresse e-mail et une clé VAPID valides", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
    expect(() => parsePublicEnv({ NEXT_PUBLIC_CONTACT_EMAIL: "contact" })).toThrow(
      /NEXT_PUBLIC_CONTACT_EMAIL/,
    );
    expect(() => parsePublicEnv({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "trop-courte" })).toThrow(
      /NEXT_PUBLIC_VAPID_PUBLIC_KEY/,
    );
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_CONTACT_EMAIL: "contact@zuvo.cm",
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "B".repeat(87),
      }),
    ).toEqual({
      NEXT_PUBLIC_CONTACT_EMAIL: "contact@zuvo.cm",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "B".repeat(87),
    });
  });
});
