import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createNonce } from "./csp";

function directives(policy: string) {
  return Object.fromEntries(
    policy.split("; ").map((part) => {
      const [name, ...values] = part.split(" ");
      return [name, values];
    }),
  );
}

describe("buildContentSecurityPolicy", () => {
  it("n'autorise que les scripts portant le nonce", () => {
    const csp = directives(buildContentSecurityPolicy({ nonce: "abc123" }));
    expect(csp["script-src"]).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(csp["script-src"]).not.toContain("'unsafe-inline'");
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
  });

  it("autorise Supabase (API, stockage et temps réel)", () => {
    const csp = directives(
      buildContentSecurityPolicy({ nonce: "n", supabaseUrl: "https://abc.supabase.co" }),
    );
    expect(csp["connect-src"]).toEqual([
      "'self'",
      "https://abc.supabase.co",
      "wss://abc.supabase.co",
    ]);
    expect(csp["img-src"]).toContain("https://abc.supabase.co");
    expect(csp["form-action"]).toContain("https://abc.supabase.co");
  });

  it("n'ajoute unsafe-eval qu'en développement et upgrade-insecure-requests en HTTPS", () => {
    const dev = buildContentSecurityPolicy({ nonce: "n", isDev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
    const prod = buildContentSecurityPolicy({ nonce: "n", upgradeInsecureRequests: true });
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod.endsWith("upgrade-insecure-requests")).toBe(true);
  });
});

describe("createNonce", () => {
  it("produit des valeurs différentes de 128 bits", () => {
    const first = createNonce();
    expect(atob(first)).toHaveLength(16);
    expect(createNonce()).not.toBe(first);
  });
});
