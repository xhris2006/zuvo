import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createDraft,
  createUser,
  expectDenied,
  expectError,
  suspendUser,
} from "./support/db";

async function setupConversation() {
  const seller = await createUser();
  const buyer = await createUser();
  const listingId = await createActiveListing(seller.id);
  const { rows } = await asUser(buyer.id, (sql) =>
    sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
  );
  return { seller, buyer, listingId, conversationId: rows[0]!.id };
}

const send = (userId: string, conversationId: string, body = "Bonjour, toujours disponible ?") =>
  asUser(userId, (sql) =>
    sql<{ id: string }>(
      "insert into public.messages (conversation_id, body) values ($1, $2) returning id",
      [conversationId, body],
    ),
  );

describe("conversations", () => {
  it("crée une conversation puis la réutilise pour le même acheteur et la même annonce", async () => {
    const { buyer, listingId, conversationId, seller } = await setupConversation();
    const { rows } = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
    );
    expect(rows[0]!.id).toBe(conversationId);
    const stored = await asOwner((sql) =>
      sql("select buyer_id, seller_id from public.conversations where id = $1", [conversationId]),
    );
    expect(stored.rows[0]).toEqual({ buyer_id: buyer.id, seller_id: seller.id });
  });

  it("n'est visible que par ses deux participants", async () => {
    const { buyer, seller, conversationId } = await setupConversation();
    const outsider = await createUser();
    const query = "select id from public.conversations where id = $1";
    expect((await asUser(buyer.id, (sql) => sql(query, [conversationId]))).rows).toHaveLength(1);
    expect((await asUser(seller.id, (sql) => sql(query, [conversationId]))).rows).toHaveLength(1);
    expect((await asUser(outsider.id, (sql) => sql(query, [conversationId]))).rows).toHaveLength(0);
    await expectDenied(asAnon((sql) => sql(query, [conversationId])));
  });

  it("empêche le vendeur de se contacter lui-même", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectError(
      asUser(seller.id, (sql) => sql("select public.get_or_create_conversation($1)", [listingId])),
      "23514",
    );
  });

  it("refuse une conversation sur un brouillon, une annonce vendue ou inexistante", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const draftId = await createDraft(seller.id);
    const soldId = await createActiveListing(seller.id);
    await asUser(seller.id, (sql) =>
      sql("update public.listings set status = 'sold' where id = $1", [soldId]),
    );
    const start = (id: string) =>
      asUser(buyer.id, (sql) => sql("select public.get_or_create_conversation($1)", [id]));
    await expectError(start(draftId), "P0002");
    await expectDenied(start(soldId));
    await expectError(start("00000000-0000-4000-8000-000000000000"), "P0002");
  });

  it("refuse une conversation falsifiée (mauvais vendeur ou acheteur usurpé)", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const impostor = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectDenied(
      asUser(buyer.id, (sql) =>
        sql("insert into public.conversations (listing_id, seller_id) values ($1, $2)", [
          listingId,
          impostor.id,
        ]),
      ),
    );
    await expectDenied(
      asUser(impostor.id, (sql) =>
        sql(
          "insert into public.conversations (listing_id, buyer_id, seller_id) values ($1, $2, $3)",
          [listingId, buyer.id, seller.id],
        ),
      ),
    );
  });

  it("refuse le contact en cas de blocage, dans les deux sens", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id);
    await asUser(seller.id, (sql) =>
      sql("insert into public.blocks (blocked_id) values ($1)", [buyer.id]),
    );
    await expectDenied(
      asUser(buyer.id, (sql) => sql("select public.get_or_create_conversation($1)", [listingId])),
    );
  });

  it("ne peut pas être modifiée ni supprimée via l'API", async () => {
    const { buyer, conversationId } = await setupConversation();
    await expectDenied(
      asUser(buyer.id, (sql) =>
        sql("update public.conversations set seller_id = $2 where id = $1", [
          conversationId,
          buyer.id,
        ]),
      ),
    );
    await expectDenied(
      asUser(buyer.id, (sql) =>
        sql("delete from public.conversations where id = $1", [conversationId]),
      ),
    );
  });
});

describe("messages", () => {
  it("sont échangés entre participants et mettent à jour la conversation", async () => {
    const { buyer, seller, conversationId } = await setupConversation();
    await send(buyer.id, conversationId);
    await send(seller.id, conversationId, "Oui, toujours disponible.");
    const { rows } = await asUser(seller.id, (sql) =>
      sql<{ total: number; last_ok: boolean }>(
        `select count(*)::int as total,
                max(m.created_at) = (select last_message_at from public.conversations where id = $1) as last_ok
         from public.messages m where m.conversation_id = $1`,
        [conversationId],
      ),
    );
    expect(rows[0]).toEqual({ total: 2, last_ok: true });
  });

  it("ne sont pas lisibles par un tiers", async () => {
    const { buyer, conversationId } = await setupConversation();
    const outsider = await createUser();
    await send(buyer.id, conversationId);
    const query = "select body from public.messages where conversation_id = $1";
    expect((await asUser(outsider.id, (sql) => sql(query, [conversationId]))).rows).toEqual([]);
    await expectDenied(asAnon((sql) => sql(query, [conversationId])));
  });

  it("ne peuvent pas être envoyés dans la conversation d'autrui", async () => {
    const { conversationId } = await setupConversation();
    const outsider = await createUser();
    await expectDenied(send(outsider.id, conversationId));
  });

  it("ne permettent pas d'usurper l'expéditeur", async () => {
    const { buyer, seller, conversationId } = await setupConversation();
    await expectDenied(
      asUser(buyer.id, (sql) =>
        sql(
          "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Faux')",
          [conversationId, seller.id],
        ),
      ),
    );
  });

  it("ne peuvent être ni modifiés ni supprimés, seulement marqués comme lus", async () => {
    const { buyer, seller, conversationId } = await setupConversation();
    const { rows } = await send(buyer.id, conversationId);
    const messageId = rows[0]!.id;
    await expectDenied(
      asUser(buyer.id, (sql) =>
        sql("update public.messages set body = 'modifié' where id = $1", [messageId]),
      ),
    );
    await expectDenied(
      asUser(buyer.id, (sql) => sql("delete from public.messages where id = $1", [messageId])),
    );
    const ownRead = await asUser(buyer.id, (sql) =>
      sql("update public.messages set read_at = now() where id = $1", [messageId]),
    );
    expect(ownRead.rowCount).toBe(0);
    const marked = await asUser(seller.id, (sql) =>
      sql<{ count: number }>("select public.mark_conversation_read($1) as count", [conversationId]),
    );
    expect(marked.rows[0]).toEqual({ count: 1 });
  });

  it("sont refusés après un blocage", async () => {
    const { buyer, seller, conversationId } = await setupConversation();
    await asUser(seller.id, (sql) =>
      sql("insert into public.blocks (blocked_id) values ($1)", [buyer.id]),
    );
    await expectDenied(send(buyer.id, conversationId));
    await expectDenied(send(seller.id, conversationId));
  });

  it("sont refusés pour un compte suspendu", async () => {
    const { buyer, conversationId } = await setupConversation();
    await suspendUser(buyer.id);
    await expectDenied(send(buyer.id, conversationId));
  });

  it("valident leur contenu", async () => {
    const { buyer, conversationId } = await setupConversation();
    await expectError(send(buyer.id, conversationId, "   "), "23514");
    await expectError(send(buyer.id, conversationId, "x".repeat(2001)), "23514");
  });

  it("sont limités en rafale", async () => {
    const { buyer, conversationId } = await setupConversation();
    await asOwner((sql) =>
      sql(
        `insert into public.messages (conversation_id, sender_id, body)
         select $1, $2, 'Message ' || n from generate_series(1, 20) as n`,
        [conversationId, buyer.id],
      ),
    );
    await expectError(send(buyer.id, conversationId), "PT429", /rate_limit_exceeded/);
  });

  it("restent accessibles à l'autre participant après suppression d'un compte", async () => {
    const { buyer, seller, conversationId } = await setupConversation();
    await send(buyer.id, conversationId);
    await asOwner((sql) => sql("delete from auth.users where id = $1", [buyer.id]));
    const { rows } = await asUser(seller.id, (sql) =>
      sql("select sender_id from public.messages where conversation_id = $1", [conversationId]),
    );
    expect(rows).toEqual([{ sender_id: null }]);
    await expectDenied(send(seller.id, conversationId));
  });
});
