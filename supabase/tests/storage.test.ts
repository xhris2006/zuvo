import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createDraft,
  createUser,
  expectDenied,
} from "./support/db";

const upload = (userId: string, bucket: string, name: string) =>
  asUser(userId, (sql) =>
    sql("insert into storage.objects (bucket_id, name, owner_id) values ($1, $2, $3)", [
      bucket,
      name,
      userId,
    ]),
  );

describe("configuration des buckets", () => {
  it("impose taille maximale, types d'images et visibilité", async () => {
    const { rows } = await asOwner((sql) =>
      sql(
        "select id, public, file_size_limit::int as limit, allowed_mime_types from storage.buckets order by id",
      ),
    );
    const images = ["image/jpeg", "image/png", "image/webp"];
    expect(rows).toEqual([
      { id: "avatars", public: true, limit: 2097152, allowed_mime_types: images },
      { id: "listing-images", public: true, limit: 8388608, allowed_mime_types: images },
      { id: "message-attachments", public: false, limit: 8388608, allowed_mime_types: images },
    ]);
  });
});

describe("listing-images", () => {
  it("accepte un envoi dans le dossier du vendeur pour sa propre annonce", async () => {
    const seller = await createUser();
    const listingId = await createDraft(seller.id);
    await upload(seller.id, "listing-images", `${seller.id}/${listingId}/${randomUUID()}.webp`);
  });

  it("refuse les envois hors du dossier du vendeur ou pour l'annonce d'un autre", async () => {
    const seller = await createUser();
    const other = await createUser();
    const listingId = await createDraft(seller.id);
    const otherListing = await createDraft(other.id);
    await expectDenied(
      upload(seller.id, "listing-images", `${other.id}/${otherListing}/photo.webp`),
    );
    await expectDenied(
      upload(seller.id, "listing-images", `${seller.id}/${otherListing}/photo.webp`),
    );
    await expectDenied(upload(seller.id, "listing-images", `${seller.id}/photo.webp`));
    await expectDenied(upload(seller.id, "listing-images", `${seller.id}/pas-un-uuid/photo.webp`));
    await expectDenied(
      asAnon((sql) =>
        sql("insert into storage.objects (bucket_id, name) values ('listing-images', $1)", [
          `${seller.id}/${listingId}/photo.webp`,
        ]),
      ),
    );
  });

  it("empêche l'écrasement et la suppression des fichiers d'un autre", async () => {
    const seller = await createUser();
    const attacker = await createUser();
    const listingId = await createActiveListing(seller.id);
    const name = `${seller.id}/${listingId}/${randomUUID()}.webp`;
    await upload(seller.id, "listing-images", name);
    const updated = await asUser(attacker.id, (sql) =>
      sql("update storage.objects set name = name || 'x' where name = $1", [name]),
    );
    const deleted = await asUser(attacker.id, (sql) =>
      sql("delete from storage.objects where name = $1", [name]),
    );
    expect(updated.rowCount).toBe(0);
    expect(deleted.rowCount).toBe(0);
    const own = await asUser(seller.id, (sql) =>
      sql("update storage.objects set name = name || 'x' where name = $1", [name]),
    );
    expect(own.rowCount).toBe(0);
  });
});

describe("avatars", () => {
  it("n'acceptent que le dossier de l'utilisateur", async () => {
    const user = await createUser();
    const other = await createUser();
    await upload(user.id, "avatars", `${user.id}/${randomUUID()}.webp`);
    await expectDenied(upload(user.id, "avatars", `${other.id}/${randomUUID()}.webp`));
    await expectDenied(upload(user.id, "avatars", `${user.id}/sous-dossier/photo.webp`));
  });
});

describe("message-attachments", () => {
  async function setupConversation() {
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id);
    const { rows } = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
    );
    return { seller, buyer, conversationId: rows[0]!.id };
  }

  it("sont réservées aux participants de la conversation", async () => {
    const { seller, buyer, conversationId } = await setupConversation();
    const outsider = await createUser();
    const name = `${conversationId}/${randomUUID()}.webp`;
    await upload(buyer.id, "message-attachments", name);
    await expectDenied(
      upload(outsider.id, "message-attachments", `${conversationId}/${randomUUID()}.webp`),
    );
    const query = "select name from storage.objects where name = $1";
    expect((await asUser(seller.id, (sql) => sql(query, [name]))).rows).toHaveLength(1);
    expect((await asUser(outsider.id, (sql) => sql(query, [name]))).rows).toHaveLength(0);
    expect((await asAnon((sql) => sql(query, [name]))).rows).toHaveLength(0);
  });

  it("ne peuvent être supprimées que par leur auteur", async () => {
    const { seller, buyer, conversationId } = await setupConversation();
    const name = `${conversationId}/${randomUUID()}.webp`;
    await upload(buyer.id, "message-attachments", name);
    const bySeller = await asUser(seller.id, (sql) =>
      sql("delete from storage.objects where name = $1", [name]),
    );
    expect(bySeller.rowCount).toBe(0);
    const byBuyer = await asUser(buyer.id, (sql) =>
      sql("delete from storage.objects where name = $1", [name]),
    );
    expect(byBuyer.rowCount).toBe(1);
  });

  it("sont refusées en cas de blocage", async () => {
    const { seller, buyer, conversationId } = await setupConversation();
    await asUser(seller.id, (sql) =>
      sql("insert into public.blocks (blocked_id) values ($1)", [buyer.id]),
    );
    await expectDenied(
      upload(buyer.id, "message-attachments", `${conversationId}/${randomUUID()}.webp`),
    );
  });
});
