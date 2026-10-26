import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createUser,
  expectDenied,
  getCategoryId,
} from "./support/db";

/** Mot unique (lettres seules) pour retrouver les annonces d'un test dans les résultats. */
function token() {
  return `zq${randomUUID()
    .replace(/[^a-f]/g, "")
    .slice(0, 10)}`;
}

function recordView(userId: string, listingId: string) {
  return asUser(userId, (sql) => sql("select public.record_listing_view($1)", [listingId]));
}

async function similar(listingId: string, userId?: string) {
  const query = (sql: Parameters<Parameters<typeof asAnon>[0]>[0]) =>
    sql<{ listing_id: string }>("select listing_id from public.similar_listings($1, 24)", [
      listingId,
    ]);
  const { rows } = userId ? await asUser(userId, query) : await asAnon(query);
  return rows.map((row) => row.listing_id);
}

async function recommended(userId: string) {
  const { rows } = await asUser(userId, (sql) =>
    sql<{ listing_id: string }>("select listing_id from public.recommended_listings(24)"),
  );
  return rows.map((row) => row.listing_id);
}

function favorite(userId: string, listingId: string) {
  return asUser(userId, (sql) =>
    sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
  );
}

describe("historique de consultation", () => {
  it("garde les annonces ouvertes par un membre, visibles de lui seul", async () => {
    const seller = await createUser();
    const visitor = await createUser();
    const other = await createUser();
    const listingId = await createActiveListing(seller.id);

    await recordView(visitor.id, listingId);
    await recordView(visitor.id, listingId);
    // Ouvrir sa propre annonce n'est pas une consultation.
    await recordView(seller.id, listingId);

    const read = (userId: string) =>
      asUser(userId, (sql) =>
        sql<{ user_id: string; view_count: number }>(
          "select user_id, view_count from public.listing_views where listing_id = $1",
          [listingId],
        ),
      ).then(({ rows }) => rows);
    expect(await read(visitor.id)).toEqual([{ user_id: visitor.id, view_count: 2 }]);
    expect(await read(other.id)).toEqual([]);
    expect(await read(seller.id)).toEqual([]);
  });

  it("n'est écrit que par la fonction dédiée et peut être effacé par son auteur", async () => {
    const seller = await createUser();
    const visitor = await createUser();
    const listingId = await createActiveListing(seller.id);

    await expectDenied(
      asUser(visitor.id, (sql) =>
        sql("insert into public.listing_views (user_id, listing_id) values ($1, $2)", [
          visitor.id,
          listingId,
        ]),
      ),
    );
    await expectDenied(asAnon((sql) => sql("select public.record_listing_view($1)", [listingId])));

    await recordView(visitor.id, listingId);
    await expectDenied(
      asUser(visitor.id, (sql) =>
        sql("update public.listing_views set view_count = 999 where listing_id = $1", [listingId]),
      ),
    );
    await asUser(visitor.id, (sql) => sql("delete from public.listing_views"));
    const { rows } = await asOwner((sql) =>
      sql("select 1 from public.listing_views where user_id = $1", [visitor.id]),
    );
    expect(rows).toEqual([]);
  });

  it("oublie les consultations de plus de 90 jours", async () => {
    const seller = await createUser();
    const visitor = await createUser();
    const old = await createActiveListing(seller.id);
    const recent = await createActiveListing(seller.id);
    await recordView(visitor.id, old);
    await asOwner((sql) =>
      sql(
        "update public.listing_views set viewed_at = now() - interval '120 days' where user_id = $1",
        [visitor.id],
      ),
    );
    await recordView(visitor.id, recent);
    const { rows } = await asOwner((sql) =>
      sql<{ listing_id: string }>(
        "select listing_id from public.listing_views where user_id = $1",
        [visitor.id],
      ),
    );
    expect(rows.map((row) => row.listing_id)).toEqual([recent]);
  });
});

describe("annonces similaires", () => {
  it("classent d'abord la même catégorie avec des mots du titre en commun", async () => {
    const word = token();
    const seller = await createUser();
    const other = await createUser();
    const maison = await getCategoryId("maison");
    const sport = await getCategoryId("sport-loisirs");
    const source = await createActiveListing(seller.id, {
      title: `Lampe ${word} en laiton`,
      category_id: maison,
      city: "bafoussam",
      price: 20000,
    });
    const close = await createActiveListing(other.id, {
      title: `Applique ${word} dorée`,
      category_id: maison,
      city: "bafoussam",
      price: 18000,
    });
    const sameCategory = await createActiveListing(other.id, {
      title: "Table basse en bois",
      category_id: maison,
    });
    const sameWords = await createActiveListing(other.id, {
      title: `Tapis de yoga ${word}`,
      category_id: sport,
    });
    const removed = await createActiveListing(other.id, {
      title: `Lampe ${word} retirée`,
      category_id: maison,
    });
    await asOwner((sql) =>
      sql(
        "update public.listings set removed_at = now(), removed_reason = 'Contrefaçon', status = 'withdrawn' where id = $1",
        [removed],
      ),
    );

    const results = await similar(source);
    expect(results[0]).toBe(close);
    expect(results).toContain(sameCategory);
    expect(results).toContain(sameWords);
    expect(results).not.toContain(source);
    expect(results).not.toContain(removed);

    // Le vendeur ne se voit pas proposer ses propres annonces.
    const mine = await createActiveListing(seller.id, {
      title: `Abat-jour ${word}`,
      category_id: maison,
    });
    expect(await similar(source, seller.id)).not.toContain(mine);
    expect(await similar(source, other.id)).toContain(mine);
  });

  it("rapprochent les annonces aimées par les mêmes membres, à partir de deux membres", async () => {
    const seller = await createUser();
    const source = await createActiveListing(seller.id, {
      title: `Montre ${token()}`,
      category_id: await getCategoryId("bijoux-montres"),
    });
    const unrelated = await createActiveListing(seller.id, {
      title: `Guitare ${token()}`,
      category_id: await getCategoryId("livres-musique-films"),
    });
    const fan = await createUser();
    await favorite(fan.id, source);
    await favorite(fan.id, unrelated);
    // Un seul membre : rien ne doit permettre de deviner ses favoris.
    expect(await similar(source)).not.toContain(unrelated);

    const secondFan = await createUser();
    await favorite(secondFan.id, source);
    await favorite(secondFan.id, unrelated);
    expect(await similar(source)).toContain(unrelated);
  });
});

describe("recommandations personnalisées", () => {
  it("sont vides sans activité et réservées aux membres connectés", async () => {
    const newcomer = await createUser();
    expect(await recommended(newcomer.id)).toEqual([]);
    await expectDenied(asAnon((sql) => sql("select * from public.recommended_listings(12)")));
  });

  it("suivent les consultations et les favoris, sans annonces déjà aimées, propres ou bloquées", async () => {
    const jeux = await getCategoryId("jeux-video");
    const seller = await createUser();
    const blockedSeller = await createUser();
    const member = await createUser();
    const viewed = await createActiveListing(seller.id, {
      title: `Console ${token()}`,
      category_id: jeux,
      city: "garoua",
      price: 120000,
    });
    const liked = await createActiveListing(seller.id, {
      title: `Manette ${token()}`,
      category_id: jeux,
      city: "garoua",
      price: 25000,
    });
    const suggestion = await createActiveListing(seller.id, {
      title: `Jeu de course ${token()}`,
      category_id: jeux,
      city: "garoua",
      price: 30000,
    });
    const fromBlocked = await createActiveListing(blockedSeller.id, {
      title: `Casque ${token()}`,
      category_id: jeux,
      city: "garoua",
    });
    const own = await createActiveListing(member.id, {
      title: `Écran ${token()}`,
      category_id: jeux,
      city: "garoua",
    });
    await recordView(member.id, viewed);
    await favorite(member.id, liked);
    await asUser(member.id, (sql) =>
      sql("insert into public.blocks (blocked_id) values ($1)", [blockedSeller.id]),
    );

    const results = await recommended(member.id);
    expect(results).toContain(suggestion);
    expect(results).not.toContain(liked);
    expect(results).not.toContain(own);
    expect(results).not.toContain(fromBlocked);
  });

  it("proposent les nouveautés des profils suivis", async () => {
    const seller = await createUser();
    const member = await createUser();
    const listingId = await createActiveListing(seller.id, {
      title: `Sac ${token()}`,
      category_id: await getCategoryId("sacs-accessoires"),
    });
    await asUser(member.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [seller.id]),
    );
    expect(await recommended(member.id)).toContain(listingId);
  });
});
