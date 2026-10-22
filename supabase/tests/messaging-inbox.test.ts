import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { asAnon, asUser, createActiveListing, createUser, expectDenied } from "./support/db";

async function setup() {
  const seller = await createUser({ display_name: "Vendeuse" });
  const buyer = await createUser({ display_name: "Acheteur" });
  const listingId = await createActiveListing(seller.id, { title: "Robe en wax", price: 15000 });
  const { rows } = await asUser(buyer.id, (sql) =>
    sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
  );
  return { seller, buyer, listingId, conversationId: rows[0]!.id };
}

const send = (userId: string, conversationId: string, body: string) =>
  asUser(userId, (sql) =>
    sql("insert into public.messages (conversation_id, body) values ($1, $2)", [
      conversationId,
      body,
    ]),
  );

const inbox = (userId: string) =>
  asUser(userId, (sql) => sql("select * from public.get_my_conversations()")).then(
    (result) => result.rows,
  );

describe("get_my_conversations", () => {
  it("donne l'interlocuteur, l'annonce, le dernier message et les non-lus", async () => {
    const { seller, buyer, conversationId, listingId } = await setup();
    await send(buyer.id, conversationId, "Bonjour");
    await send(buyer.id, conversationId, "Toujours disponible ?");

    const [row] = await inbox(seller.id);
    expect(row).toMatchObject({
      conversation_id: conversationId,
      listing_id: listingId,
      listing_title: "Robe en wax",
      listing_price: 15000,
      other_user_id: buyer.id,
      other_display_name: "Acheteur",
      is_buyer: false,
      last_message_body: "Toujours disponible ?",
      last_message_has_photo: false,
      last_message_is_mine: false,
      unread_count: 2,
    });
    expect(row!.listing_image_path).toMatch(new RegExp(`^${seller.id}/${listingId}/`));

    const [buyerRow] = await inbox(buyer.id);
    expect(buyerRow).toMatchObject({ is_buyer: true, last_message_is_mine: true, unread_count: 0 });
  });

  it("masque au vendeur une conversation encore vide", async () => {
    const { seller, buyer } = await setup();
    expect(await inbox(seller.id)).toEqual([]);
    expect(await inbox(buyer.id)).toHaveLength(1);
  });

  it("affiche au vendeur une conversation commencée par une photo", async () => {
    const { seller, buyer, conversationId } = await setup();
    const path = `${conversationId}/${randomUUID()}.webp`;
    await asUser(buyer.id, async (sql) => {
      await sql(
        "insert into storage.objects (bucket_id, name, owner_id) values ('message-attachments', $1, $2)",
        [path, buyer.id],
      );
      await sql("insert into public.messages (conversation_id, attachment_path) values ($1, $2)", [
        conversationId,
        path,
      ]);
    });
    const [row] = await inbox(seller.id);
    expect(row).toMatchObject({
      last_message_body: null,
      last_message_has_photo: true,
      unread_count: 1,
    });
  });

  it("n'expose rien à un tiers ni aux visiteurs", async () => {
    const { buyer, conversationId } = await setup();
    const outsider = await createUser();
    await send(buyer.id, conversationId, "Bonjour");
    expect(await inbox(outsider.id)).toEqual([]);
    await expectDenied(asAnon((sql) => sql("select * from public.get_my_conversations()")));
  });
});

describe("get_unread_messages_count", () => {
  it("compte les messages reçus non lus, toutes conversations confondues", async () => {
    const { seller, buyer, conversationId } = await setup();
    await send(buyer.id, conversationId, "Bonjour");
    await send(seller.id, conversationId, "Oui ?");
    const count = (userId: string) =>
      asUser(userId, (sql) =>
        sql<{ count: number }>("select public.get_unread_messages_count() as count"),
      ).then((result) => result.rows[0]!.count);
    expect(await count(seller.id)).toBe(1);
    expect(await count(buyer.id)).toBe(1);
    await asUser(seller.id, (sql) =>
      sql("select public.mark_conversation_read($1)", [conversationId]),
    );
    expect(await count(seller.id)).toBe(0);
  });
});
