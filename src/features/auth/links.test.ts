import { describe, expect, it } from "vitest";
import { signInHref } from "./links";

describe("signInHref", () => {
  it("encodes the return path", () => {
    expect(signInHref("/messages?c=1")).toBe("/connexion?next=%2Fmessages%3Fc%3D1");
  });

  it("omits the parameter for the home page", () => {
    expect(signInHref("/")).toBe("/connexion");
    expect(signInHref()).toBe("/connexion");
  });
});
