import { beforeEach, describe, expect, it } from "vitest";
import {
  getCategories,
  getFavoriteIds,
  getFavoriteListings,
  getFollowedFeed,
  getListingDetail,
  getOwnListings,
  getRecentListings,
  getSellerListings,
  searchListings,
} from "@/features/listings/queries";
import { getSimilarListings } from "@/features/recommendations/queries";
import { parseSearchParams } from "@/features/search/schema";
import { asUser, createActiveListing, createDraft, createUser } from "../support/db";
import { actAs } from "./support/context";

beforeEach(() => actAs(null));

describe("annonces (API)", () => {
  it("affiche le détail avec vendeur, catégorie et photos", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id, { title: "Robe wax détail" });

    const listing = await getListingDetail(listingId);
    expect(listing).toMatchObject({
      id: listingId,
      title: "Robe wax détail",
      seller: { id: seller.id, username: seller.username },
      category: { slug: "mode-femme" },
    });
    expect(listing?.images).toHaveLength(1);
  });

  it("liste les annonces récentes, du vendeur, de l'auteur et similaires", async () => {
    const seller = await createUser();
    const first = await createActiveListing(seller.id, { title: "Sac en cuir marron" });
    const second = await createActiveListing(seller.id, { title: "Sac à dos bleu" });
    const draft = await createDraft(seller.id, { title: "Brouillon privé" });

    const recent = await getRecentListings(50);
    expect(recent.map((item) => item.id)).toEqual(expect.arrayContaining([first, second]));
    expect(recent.map((item) => item.id)).not.toContain(draft);

    const sellerListings = await getSellerListings(seller.id, 1, 24);
    expect(sellerListings.total).toBe(2);

    actAs(seller);
    const own = await getOwnListings(seller.id);
    expect(own.map((item) => item.id)).toEqual(expect.arrayContaining([first, second, draft]));

    // Annonces similaires vues par un visiteur (le vendeur ne se voit pas
    // proposer ses propres annonces).
    actAs(null);
    const detail = await getListingDetail(first);
    const similar = await getSimilarListings(first, detail?.category?.id ?? null);
    expect(similar.map((item) => item.id)).toContain(second);
  });

  it("recherche par mot-clé (préfixe, sans accents), filtres et tri", async () => {
    const seller = await createUser();
    const unique = `zuvotest${Date.now()}`;
    const cheap = await createActiveListing(seller.id, {
      title: `Téléphone ${unique} reconditionné`,
      price: 20000,
      city: "yaounde",
    });
    const expensive = await createActiveListing(seller.id, {
      title: `Telephone ${unique} neuf`,
      price: 90000,
      city: "douala",
    });

    const byPrefix = await searchListings(
      parseSearchParams({ q: `telephon ${unique.slice(0, 10)}` }),
    );
    expect(byPrefix.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([cheap, expensive]),
    );

    const filtered = await searchListings(
      parseSearchParams({ q: unique, city: "douala", category: "mode-femme" }),
    );
    expect(filtered.items.map((item) => item.id)).toEqual([expensive]);

    const sorted = await searchListings(parseSearchParams({ q: unique, sort: "price_asc" }));
    expect(sorted.items.map((item) => item.price)).toEqual([20000, 90000]);

    const beyond = await searchListings(parseSearchParams({ q: unique, page: "50" }));
    expect(beyond.items).toEqual([]);
  });

  it("charge les catégories depuis la base", async () => {
    const categories = await getCategories();
    expect(categories.find((category) => category.slug === "mode-femme")?.id).toBeTruthy();
  });
});

describe("favoris et fil (API)", () => {
  it("renvoie les favoris et le fil des abonnements", async () => {
    const seller = await createUser();
    const fan = await createUser();
    const listingId = await createActiveListing(seller.id);
    await asUser(fan.id, (sql) =>
      sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
    );
    await asUser(fan.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [seller.id]),
    );

    actAs(fan);
    expect([...(await getFavoriteIds(fan.id, [listingId]))]).toEqual([listingId]);
    const favorites = await getFavoriteListings(fan.id);
    expect(favorites.items.map((item) => item.id)).toEqual([listingId]);
    const feed = await getFollowedFeed(fan.id);
    expect(feed.items.map((item) => item.id)).toContain(listingId);
  });
});
