import { describe, expect, it } from "vitest";
import { decodeBase64Url } from "./push-client";

describe("decodeBase64Url", () => {
  it("décode une clé base64url sans remplissage", () => {
    const bytes = new Uint8Array([251, 255, 0, 1, 2]);
    const encoded = Buffer.from(bytes).toString("base64url");
    expect(Array.from(decodeBase64Url(encoded))).toEqual(Array.from(bytes));
  });
});
