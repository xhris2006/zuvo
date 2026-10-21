import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { vapidKeysMatch } from "./diagnostics";

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwkPublic = publicKey.export({ format: "jwk" });
  const jwkPrivate = privateKey.export({ format: "jwk" });
  const raw = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwkPublic.x!, "base64url"),
    Buffer.from(jwkPublic.y!, "base64url"),
  ]);
  return { publicKey: raw.toString("base64url"), privateKey: jwkPrivate.d! };
}

describe("vapidKeysMatch", () => {
  it("reconnaît une paire de clés cohérente", () => {
    const pair = keyPair();
    expect(vapidKeysMatch(pair.publicKey, pair.privateKey)).toBe(true);
  });

  it("détecte des clés qui ne vont pas ensemble ou invalides", () => {
    const first = keyPair();
    const second = keyPair();
    expect(vapidKeysMatch(first.publicKey, second.privateKey)).toBe(false);
    expect(vapidKeysMatch(first.publicKey, "pas-une-cle")).toBe(false);
  });
});
