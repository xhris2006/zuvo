import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  asOwner,
  asUser,
  createActiveListing,
  createUser,
  expectDenied,
  suspendUser,
} from "./support/db";

describe("comptes suspendus", () => {
  it("ne peuvent plus ajouter de favoris ni modifier leur profil", async () => {
    const seller = await createUser();
    const suspended = await createUser();
    const listingId = await createActiveListing(seller.id);
    await suspendUser(suspended.id);

    await expectDenied(
      asUser(suspended.id, (sql) =>
        sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
      ),
    );
    await expectDenied(
      asUser(suspended.id, (sql) =>
        sql("update public.profiles set display_name = 'WhatsApp +237 6…' where id = $1", [
          suspended.id,
        ]),
      ),
    );
    const notifications = await asOwner((sql) =>
      sql("select id from public.notifications where user_id = $1", [seller.id]),
    );
    expect(notifications.rows).toHaveLength(0);
  });
});

describe("annonce retirée par la modération", () => {
  it("ses photos ne peuvent plus être supprimées du stockage par le vendeur", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    const name = `${seller.id}/${listingId}/${randomUUID()}.webp`;
    await asUser(seller.id, (sql) =>
      sql(
        "insert into storage.objects (bucket_id, name, owner_id) values ('listing-images', $1, $2)",
        [name, seller.id],
      ),
    );
    await asOwner((sql) =>
      sql(
        "update public.listings set status = 'withdrawn', removed_at = now(), removed_reason = 'Contrefaçon' where id = $1",
        [listingId],
      ),
    );

    const deleted = await asUser(seller.id, (sql) =>
      sql("delete from storage.objects where name = $1", [name]),
    );
    expect(deleted.rowCount).toBe(0);

    // Après restauration, le vendeur gère de nouveau ses photos.
    await asOwner((sql) =>
      sql("update public.listings set removed_at = null, removed_reason = null where id = $1", [
        listingId,
      ]),
    );
    const allowed = await asUser(seller.id, (sql) =>
      sql("delete from storage.objects where name = $1", [name]),
    );
    expect(allowed.rowCount).toBe(1);
  });
});
