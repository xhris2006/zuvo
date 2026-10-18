import { describe, expect, it } from "vitest";
import { buildPrefixTsQuery } from "@/features/search/text-query";
import {
  addImage,
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createDraft,
  createUser,
  expectDenied,
  expectError,
  imagePath,
  suspendUser,
} from "./support/db";

const visibleTo = async (listingId: string, userId: string | null) => {
  const query = "select id from public.listings where id = $1";
  const result = userId
    ? await asUser(userId, (sql) => sql(query, [listingId]))
    : await asAnon((sql) => sql(query, [listingId]));
  return result.rows.length === 1;
};

describe("création et publication", () => {
  it("crée toujours un brouillon au nom de l'utilisateur connecté", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    const { rows } = await asOwner((sql) =>
      sql("select seller_id, status, published_at from public.listings where id = $1", [listingId]),
    );
    expect(rows[0]).toEqual({ seller_id: seller.id, status: "draft", published_at: null });
  });

  it("refuse de créer une annonce au nom d'un autre vendeur", async () => {
    const seller = await createUser();
    const attacker = await createUser();
    await expectDenied(
      asUser(attacker.id, (sql) =>
        sql("insert into public.listings (seller_id, title) values ($1, 'Annonce usurpée')", [
          seller.id,
        ]),
      ),
    );
  });

  it("refuse de fixer directement le statut, les dates ou la modération à la création", async () => {
    const seller = await createUser();
    for (const column of ["status", "published_at", "removed_at", "created_at"]) {
      const value = column === "status" ? "'active'" : "now()";
      await expectDenied(
        asUser(seller.id, (sql) =>
          sql(`insert into public.listings (title, ${column}) values ('Titre valide', ${value})`),
        ),
      );
    }
  });

  it("n'expose pas les brouillons", async () => {
    const seller = await createUser();
    const other = await createUser();
    const listingId = await createDraft(seller.id);
    expect(await visibleTo(listingId, null)).toBe(false);
    expect(await visibleTo(listingId, other.id)).toBe(false);
    expect(await visibleTo(listingId, seller.id)).toBe(true);
  });

  it("exige au moins une photo pour publier", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    await expectError(
      asUser(seller.id, (sql) =>
        sql("update public.listings set status = 'active' where id = $1", [listingId]),
      ),
      "P0001",
      /listing_requires_image/,
    );
  });

  it("exige une annonce complète pour publier", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id, { price: null });
    await addImage(seller.id, listingId);
    await expectError(
      asUser(seller.id, (sql) =>
        sql("update public.listings set status = 'active' where id = $1", [listingId]),
      ),
      "23514",
      /listings_publishable/,
    );
  });

  it("publie une annonce complète, visible de tous avec sa date de publication", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    expect(await visibleTo(listingId, null)).toBe(true);
    const { rows } = await asAnon((sql) =>
      sql("select published_at is not null as published from public.listings where id = $1", [
        listingId,
      ]),
    );
    expect(rows[0]).toEqual({ published: true });
  });

  it("valide prix, titre et description", async () => {
    const seller = await createUser();
    await expectError(createDraft(seller.id, { price: -1 }), "23514");
    await expectError(createDraft(seller.id, { price: 100_000_001 }), "23514");
    await expectError(createDraft(seller.id, { title: "ab" }), "23514");
    await expectError(createDraft(seller.id, { description: "x".repeat(2001) }), "23514");
    await expectError(createDraft(seller.id, { condition: "cassé" }), "22P02");
  });

  it("interdit de repasser une annonce publiée en brouillon", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectError(
      asUser(seller.id, (sql) =>
        sql("update public.listings set status = 'draft' where id = $1", [listingId]),
      ),
      "P0001",
      /listing_cannot_return_to_draft/,
    );
  });

  it("permet au vendeur de marquer son annonce réservée, vendue ou retirée", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    for (const status of ["reserved", "sold", "withdrawn", "active"]) {
      const { rowCount } = await asUser(seller.id, (sql) =>
        sql("update public.listings set status = $2 where id = $1", [listingId, status]),
      );
      expect(rowCount).toBe(1);
    }
    await asUser(seller.id, (sql) =>
      sql("update public.listings set status = 'withdrawn' where id = $1", [listingId]),
    );
    expect(await visibleTo(listingId, null)).toBe(false);
  });
});

describe("modification et suppression", () => {
  it("empêche un autre utilisateur de modifier ou supprimer l'annonce", async () => {
    const seller = await createUser();
    const attacker = await createUser();
    const listingId = await createActiveListing(seller.id);
    const updated = await asUser(attacker.id, (sql) =>
      sql("update public.listings set price = 1 where id = $1", [listingId]),
    );
    const deleted = await asUser(attacker.id, (sql) =>
      sql("delete from public.listings where id = $1", [listingId]),
    );
    expect(updated.rowCount).toBe(0);
    expect(deleted.rowCount).toBe(0);
  });

  it("empêche le vendeur de changer de propriétaire ou de lever un retrait de modération", async () => {
    const seller = await createUser();
    const other = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectDenied(
      asUser(seller.id, (sql) =>
        sql("update public.listings set seller_id = $2 where id = $1", [listingId, other.id]),
      ),
    );
    await expectDenied(
      asUser(seller.id, (sql) =>
        sql("update public.listings set removed_at = null where id = $1", [listingId]),
      ),
    );
  });

  it("refuse toute modification à un visiteur anonyme", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectDenied(
      asAnon((sql) => sql("update public.listings set price = 1 where id = $1", [listingId])),
    );
    await expectDenied(
      asAnon((sql) => sql("delete from public.listings where id = $1", [listingId])),
    );
  });

  it("permet au vendeur de supprimer son annonce", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    const { rowCount } = await asUser(seller.id, (sql) =>
      sql("delete from public.listings where id = $1", [listingId]),
    );
    expect(rowCount).toBe(1);
  });
});

describe("modération et suspension", () => {
  it("masque une annonce retirée par la modération et empêche sa remise en ligne", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await asOwner((sql) =>
      sql(
        "update public.listings set status = 'withdrawn', removed_at = now(), removed_reason = 'Objet interdit' where id = $1",
        [listingId],
      ),
    );
    expect(await visibleTo(listingId, null)).toBe(false);
    expect(await visibleTo(listingId, seller.id)).toBe(true);
    await expectError(
      asUser(seller.id, (sql) =>
        sql("update public.listings set status = 'active' where id = $1", [listingId]),
      ),
      "P0001",
      /listing_removed_by_moderation/,
    );
    const deleted = await asUser(seller.id, (sql) =>
      sql("delete from public.listings where id = $1", [listingId]),
    );
    expect(deleted.rowCount).toBe(0);
  });

  it("masque les annonces d'un compte suspendu et l'empêche d'en publier", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await suspendUser(seller.id);
    expect(await visibleTo(listingId, null)).toBe(false);
    await expectDenied(createDraft(seller.id));
    await expectDenied(
      asUser(seller.id, (sql) =>
        sql("update public.listings set price = 1 where id = $1", [listingId]),
      ),
    );
  });
});

describe("photos d'annonces", () => {
  it("n'accepte que des chemins dans le dossier du vendeur et de l'annonce", async () => {
    const seller = await createUser();
    const other = await createUser();
    const listingId = await createDraft(seller.id);
    const otherListing = await createDraft(other.id);
    const insert = (path: string) =>
      asUser(seller.id, (sql) =>
        sql(
          "insert into public.listing_images (listing_id, storage_path, sort_order) values ($1, $2, 0)",
          [listingId, path],
        ),
      );
    await expectDenied(insert(imagePath(other.id, listingId)));
    await expectDenied(insert(imagePath(seller.id, otherListing)));
    await expectDenied(insert("../../etc/passwd"));
    await expectError(insert(`${seller.id}/${listingId}/../../evil`), "23514");
  });

  it("empêche d'ajouter des photos à l'annonce d'un autre", async () => {
    const seller = await createUser();
    const attacker = await createUser();
    const listingId = await createDraft(seller.id);
    await expectDenied(
      asUser(attacker.id, (sql) =>
        sql(
          "insert into public.listing_images (listing_id, storage_path, sort_order) values ($1, $2, 0)",
          [listingId, imagePath(attacker.id, listingId)],
        ),
      ),
    );
  });

  it("limite à 8 photos par annonce", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    for (let order = 0; order < 8; order += 1) {
      await addImage(seller.id, listingId, order);
    }
    await expectError(addImage(seller.id, listingId, 7), "P0001", /listing_image_limit_reached/);
  });

  it("suit la visibilité de l'annonce", async () => {
    const seller = await createUser();
    const draftId = await createDraft(seller.id);
    await addImage(seller.id, draftId);
    const activeId = await createActiveListing(seller.id);
    const query = "select id from public.listing_images where listing_id = $1";
    expect((await asAnon((sql) => sql(query, [draftId]))).rows).toHaveLength(0);
    expect((await asAnon((sql) => sql(query, [activeId]))).rows).toHaveLength(1);
  });

  it("conserve au moins une photo sur une annonce publiée", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectError(
      asUser(seller.id, (sql) =>
        sql("delete from public.listing_images where listing_id = $1", [listingId]),
      ),
      "P0001",
      /listing_requires_image/,
    );
  });

  it("réorganise les photos et définit la photo principale", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    const first = await addImage(seller.id, listingId, 0);
    const second = await addImage(seller.id, listingId, 1);
    const third = await addImage(seller.id, listingId, 2);
    await asUser(seller.id, (sql) =>
      sql("select public.reorder_listing_images($1, $2)", [listingId, [third, first, second]]),
    );
    const { rows } = await asUser(seller.id, (sql) =>
      sql<{ id: string }>(
        "select id from public.listing_images where listing_id = $1 order by sort_order",
        [listingId],
      ),
    );
    expect(rows.map((row) => row.id)).toEqual([third, first, second]);
  });

  it("refuse la réorganisation par un autre utilisateur ou avec une liste incomplète", async () => {
    const seller = await createUser();
    const attacker = await createUser();
    const listingId = await createActiveListing(seller.id);
    const second = await addImage(seller.id, listingId, 1);
    await expectError(
      asUser(attacker.id, (sql) =>
        sql("select public.reorder_listing_images($1, $2)", [listingId, [second]]),
      ),
      "P0002",
    );
    await expectError(
      asUser(seller.id, (sql) =>
        sql("select public.reorder_listing_images($1, $2)", [listingId, [second]]),
      ),
      "P0001",
      /invalid_image_order/,
    );
  });
});

describe("recherche plein texte", () => {
  it("ignore les accents et la casse", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id, {
      title: "Téléphone Samsung Galaxy",
      description: "Écran intact, livré avec son chargeur d'origine.",
    });
    const { rows } = await asAnon((sql) =>
      sql(
        `select id from public.listings
         where search_vector @@ websearch_to_tsquery('public.french_unaccent', $1)`,
        ["telephone ecran"],
      ),
    );
    expect(rows.map((row) => row.id)).toContain(listingId);
  });
});

describe("recherche par préfixe (requête construite par l'application)", () => {
  it.each(["telephon", "TÉLÉPHONES samsung", "galax", "écran chargeur"])(
    "trouve l'annonce pour %j",
    async (input) => {
      const seller = await createUser();
      const listingId = await createActiveListing(seller.id, {
        title: "Téléphone Samsung Galaxy",
        description: "Écran intact, livré avec son chargeur d'origine.",
      });
      const { rows } = await asAnon((sql) =>
        sql(
          `select id from public.listings
           where search_vector @@ to_tsquery('public.french_unaccent', $1)`,
          [buildPrefixTsQuery(input)],
        ),
      );
      expect(rows.map((row) => row.id)).toContain(listingId);
    },
  );

  it("ne trouve pas une annonce sans rapport", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id, { title: "Table basse en bois" });
    const { rows } = await asAnon((sql) =>
      sql(
        `select id from public.listings
         where search_vector @@ to_tsquery('public.french_unaccent', $1)`,
        [buildPrefixTsQuery("iphone")],
      ),
    );
    expect(rows.map((row) => row.id)).not.toContain(listingId);
  });
});

describe("limitation anti-spam", () => {
  it("limite le nombre d'annonces créées par jour", async () => {
    const seller = await createUser();
    await asOwner((sql) =>
      sql(
        `insert into public.listings (seller_id, title)
         select $1, 'Annonce ' || n from generate_series(1, 30) as n`,
        [seller.id],
      ),
    );
    await expectError(createDraft(seller.id), "PT429", /rate_limit_exceeded/);
  });
});
