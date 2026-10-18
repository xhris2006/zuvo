import { describe, expect, it } from "vitest";
import {
  addImage,
  asOwner,
  asUser,
  createActiveListing,
  createDraft,
  createUser,
  expectError,
  imagePath,
} from "./support/db";

const sync = (userId: string, listingId: string, images: unknown) =>
  asUser(userId, (sql) =>
    sql<{ removed: string[] }>("select public.sync_listing_images($1, $2) as removed", [
      listingId,
      JSON.stringify(images),
    ]),
  );

const imagesOf = async (listingId: string) =>
  (
    await asOwner((sql) =>
      sql<{ id: string; storage_path: string; sort_order: number }>(
        "select id, storage_path, sort_order from public.listing_images where listing_id = $1 order by sort_order",
        [listingId],
      ),
    )
  ).rows;

describe("sync_listing_images", () => {
  it("ajoute, réordonne et retire des photos en une opération", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    const first = await addImage(seller.id, listingId, 0);
    const second = await addImage(seller.id, listingId, 1);
    const removedPath = (await imagesOf(listingId)).find(
      (image) => image.id === first,
    )!.storage_path;
    const newPath = imagePath(seller.id, listingId);

    const { rows } = await sync(seller.id, listingId, [{ path: newPath }, { id: second }]);

    expect(rows[0]!.removed).toEqual([removedPath]);
    const images = await imagesOf(listingId);
    expect(images.map((image) => image.storage_path)[0]).toBe(newPath);
    expect(images.map((image) => image.id)[1]).toBe(second);
    expect(images.map((image) => image.sort_order)).toEqual([0, 1]);
  });

  it("permet de remplacer toutes les photos d'une annonce publiée", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await sync(seller.id, listingId, [
      { path: imagePath(seller.id, listingId) },
      { path: imagePath(seller.id, listingId) },
    ]);
    expect(await imagesOf(listingId)).toHaveLength(2);
  });

  it("refuse de laisser une annonce publiée sans photo", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectError(sync(seller.id, listingId, []), "P0001", /listing_requires_image/);
    expect(await imagesOf(listingId)).toHaveLength(1);
  });

  it("limite à 8 photos", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    const images = Array.from({ length: 9 }, () => ({ path: imagePath(seller.id, listingId) }));
    await expectError(sync(seller.id, listingId, images), "P0001", /listing_image_limit_reached/);
  });

  it("refuse les annonces et photos d'autrui", async () => {
    const seller = await createUser();
    const attacker = await createUser();
    const listingId = await createActiveListing(seller.id);
    const [image] = await imagesOf(listingId);
    await expectError(sync(attacker.id, listingId, [{ id: image!.id }]), "P0002");

    const ownListing = await createDraft(attacker.id);
    await expectError(
      sync(attacker.id, ownListing, [{ id: image!.id }]),
      "P0001",
      /invalid_images/,
    );
    await expectError(
      sync(attacker.id, ownListing, [{ path: imagePath(seller.id, listingId) }]),
      "42501",
    );
  });

  it("refuse les éléments malformés ou répétés", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    const image = await addImage(seller.id, listingId, 0);
    for (const payload of [
      [{ id: image }, { id: image }],
      [{ id: image, path: "x" }],
      [{}],
      { id: image },
    ]) {
      await expectError(sync(seller.id, listingId, payload), "P0001", /invalid_images/);
    }
  });
});
