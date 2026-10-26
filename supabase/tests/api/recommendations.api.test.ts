import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearListingViews,
  getRecommendedListings,
  getSimilarListings,
  recordListingView,
} from "@/features/recommendations/queries";
import { createActiveListing, createUser, getCategoryId } from "../support/db";
import { actAs } from "./support/context";

beforeEach(() => actAs(null));

/** Mot unique (lettres seules) pour retrouver les annonces du test. */
function token() {
  return `zq${randomUUID()
    .replace(/[^a-f]/g, "")
    .slice(0, 10)}`;
}

describe("recommandations (API)", () => {
  it("suivent les consultations, proposent des annonces similaires et s'effacent", async () => {
    const word = token();
    const maison = await getCategoryId("maison");
    const seller = await createUser();
    const visitor = await createUser();
    const seen = await createActiveListing(seller.id, {
      title: `Chaise ${word} en rotin`,
      category_id: maison,
      city: "kribi",
    });
    const close = await createActiveListing(seller.id, {
      title: `Fauteuil ${word} en rotin`,
      category_id: maison,
      city: "kribi",
    });

    actAs(visitor);
    expect(await getRecommendedListings()).toEqual([]);
    await recordListingView(seen);

    const recommended = await getRecommendedListings(24);
    expect(recommended.map((item) => item.id)).toContain(close);
    expect(recommended[0]).toMatchObject({ id: expect.any(String), title: expect.any(String) });

    const similar = await getSimilarListings(seen, maison);
    expect(similar[0]?.id).toBe(close);

    expect(await clearListingViews(visitor.id)).toBe(true);
    expect(await getRecommendedListings()).toEqual([]);
  });

  it("ne garde rien pour un visiteur non connecté", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expect(recordListingView(listingId)).resolves.toBeUndefined();
    expect(await getRecommendedListings()).toEqual([]);
    expect(await getSimilarListings(listingId, null)).toEqual(expect.any(Array));
  });
});
