import { describe, expect, it } from "vitest";
import { buildMosaicColumns } from "./mosaic";

const listing = (id: string, imageUrl: string | null = `https://cdn.test/${id}.webp`) => ({
  id,
  imageUrl,
});

describe("buildMosaicColumns", () => {
  it("remplit toujours chaque colonne, même sans annonce", () => {
    const columns = buildMosaicColumns([], 3, 4);
    expect(columns).toHaveLength(3);
    for (const column of columns) {
      expect(column).toHaveLength(4);
      expect(column.every((tile) => tile.kind === "placeholder")).toBe(true);
    }
    const keys = columns.flat().map((tile) => tile.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ignore les annonces sans photo et les doublons", () => {
    const columns = buildMosaicColumns(
      [
        listing("a"),
        listing("b", null),
        listing("a"),
        listing("c", "https://cdn.test/a.webp"),
        listing("d"),
      ],
      2,
      2,
    );
    const photos = columns.flat().filter((tile) => tile.kind === "photo");
    expect(photos.map((tile) => tile.kind === "photo" && tile.listingId)).toEqual(["a", "d"]);
    expect(columns.flat()).toHaveLength(4);
  });

  it("ne dépasse jamais colonnes × vignettes par colonne", () => {
    const many = Array.from({ length: 30 }, (_, index) => listing(`l${index}`));
    const columns = buildMosaicColumns(many, 3, 4);
    expect(columns.flat()).toHaveLength(12);
    expect(columns.flat().every((tile) => tile.kind === "photo")).toBe(true);
  });

  it("répartit les photos tour à tour dans les colonnes", () => {
    const columns = buildMosaicColumns(
      ["a", "b", "c", "d"].map((id) => listing(id)),
      3,
      2,
    );
    const ids = columns.map((column) =>
      column.map((tile) => (tile.kind === "photo" ? tile.listingId : "·")),
    );
    expect(ids).toEqual([
      ["a", "d"],
      ["b", "·"],
      ["c", "·"],
    ]);
  });

  it("tolère des dimensions invalides", () => {
    expect(buildMosaicColumns([listing("a")], 0, 0)).toEqual([
      [{ kind: "photo", key: "photo-a", listingId: "a", imageUrl: "https://cdn.test/a.webp" }],
    ]);
  });
});
