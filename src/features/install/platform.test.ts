import { describe, expect, it } from "vitest";
import { platformFromUserAgent } from "./platform";

describe("platformFromUserAgent", () => {
  it("reconnaît iPhone, iPad et Android", () => {
    expect(
      platformFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("ios");
    expect(platformFromUserAgent("Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X)")).toBe("ios");
    expect(
      platformFromUserAgent(
        "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
      ),
    ).toBe("android");
  });

  it("considère le reste comme un ordinateur", () => {
    expect(
      platformFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36"),
    ).toBe("desktop");
    expect(platformFromUserAgent("")).toBe("desktop");
  });
});
