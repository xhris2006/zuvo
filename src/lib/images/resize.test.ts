import { describe, expect, it } from "vitest";
import { computeTargetSize } from "./resize";

describe("computeTargetSize", () => {
  it("réduit sans déformer", () => {
    expect(computeTargetSize(4000, 3000, 1600)).toMatchObject({ width: 1600, height: 1200 });
  });

  it("n'agrandit jamais une petite image", () => {
    expect(computeTargetSize(800, 600, 1600)).toMatchObject({ width: 800, height: 600 });
  });

  it("recadre au centre en mode carré", () => {
    expect(computeTargetSize(1200, 800, 512, true)).toEqual({
      width: 512,
      height: 512,
      crop: { sx: 200, sy: 0, sWidth: 800, sHeight: 800 },
    });
  });
});
