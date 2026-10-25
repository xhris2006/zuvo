import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { getFeedListings } from "@/features/listings/feed";
import { searchShops } from "@/features/profiles/shops";
import { asUser, createActiveListing, createDraft, createUser, suspendUser } from "../support/db";
import { actAs } from "./support/context";

beforeEach(() => actAs(null));

describe("fil d'annonces (API)", () => {
  it("renvoie les annonces en vente avec leur vendeur et leur date de publication", async () => {
    const seller = await createUser({ display_name: "Vendeuse du fil" });
    const listingId = await createActiveListing(seller.id, { title: "Lampe de chevet" });
    const draft = await createDraft(seller.id, { title: "Brouillon du fil" });

    const feed = await getFeedListings({ pageSize: 100 });
    const item = feed.items.find((listing) => listing.id === listingId);
    expect(item).toMatchObject({
      title: "Lampe de chevet",
      status: "active",
      seller: { username: seller.username, displayName: "Vendeuse du fil", avatarPath: null },
      publishedAt: expect.any(String),
    });
    expect(feed.items.map((listing) => listing.id)).not.toContain(draft);
    expect(feed.total).toBeGreaterThanOrEqual(1);

    const dates = feed.items.map((listing) => listing.publishedAt ?? "");
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("limite le fil aux vendeurs suivis, et renvoie un fil vide sans abonnement", async () => {
    const followed = await createUser();
    const other = await createUser();
    const fan = await createUser();
    const lonely = await createUser();
    const kept = await createActiveListing(followed.id);
    const ignored = await createActiveListing(other.id);
    await asUser(fan.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [followed.id]),
    );

    actAs(fan);
    const feed = await getFeedListings({ followerId: fan.id });
    expect(feed.items.map((listing) => listing.id)).toEqual([kept]);
    expect(feed.items.map((listing) => listing.id)).not.toContain(ignored);
    expect(feed.total).toBe(1);

    actAs(lonely);
    expect(await getFeedListings({ followerId: lonely.id })).toEqual({
      items: [],
      total: 0,
      pageSize: 24,
    });
  });

  it("tolère une page au-delà des résultats", async () => {
    const followed = await createUser();
    const fan = await createUser();
    await createActiveListing(followed.id);
    await asUser(fan.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [followed.id]),
    );
    actAs(fan);
    const feed = await getFeedListings({ followerId: fan.id, page: 50 });
    expect(feed.items).toEqual([]);
  });
});

describe("recherche de boutiques (API)", () => {
  it("trouve une boutique par nom ou pseudo avec son nombre d'annonces en vente", async () => {
    const marker = `boutik${randomUUID().slice(0, 6)}`;
    const shop = await createUser({
      username: `${marker}_shop`,
      display_name: "Marie-Claire Ndongo",
    });
    await createActiveListing(shop.id);
    await createActiveListing(shop.id);
    await createDraft(shop.id);

    const byUsername = await searchShops({ q: `${marker} shop` });
    expect(byUsername.items).toEqual([
      {
        id: shop.id,
        username: shop.username,
        displayName: "Marie-Claire Ndongo",
        avatarPath: null,
        city: null,
        activeListings: 2,
      },
    ]);
    expect(byUsername.total).toBe(1);

    const byName = await searchShops({ q: `marie-claire ${marker}` });
    expect(byName.items.map((item) => item.id)).toEqual([shop.id]);
  });

  it("inclut les profils sans annonce lors d'une recherche mais pas dans la liste par défaut", async () => {
    const marker = `vide${randomUUID().slice(0, 6)}`;
    const buyer = await createUser({ username: marker });

    const searched = await searchShops({ q: marker });
    expect(searched.items).toEqual([expect.objectContaining({ id: buyer.id, activeListings: 0 })]);

    const all = await searchShops({ pageSize: 1000 });
    expect(all.items.map((item) => item.id)).not.toContain(buyer.id);
    expect(all.items.every((item) => item.activeListings > 0)).toBe(true);
  });

  it("écarte les comptes suspendus et neutralise la syntaxe PostgREST", async () => {
    const marker = `susp${randomUUID().slice(0, 6)}`;
    const suspended = await createUser({ username: marker });
    await createActiveListing(suspended.id);
    await suspendUser(suspended.id);

    expect((await searchShops({ q: marker })).items).toEqual([]);
    const injected = await searchShops({ q: `${marker}%,id.neq.0),(username.ilike.*` });
    expect(injected.items).toEqual([]);
  });
});
