import { describe, expect, it } from "vitest";
import { asOwner, asUser, createActiveListing, createUser } from "./support/db";

/** Suppression comme le fait Supabase Auth (rôle supabase_auth_admin). */
async function deleteAuthUser(userId: string) {
  await asOwner(async (sql) => {
    await sql("set local role supabase_auth_admin");
    await sql("delete from auth.users where id = $1", [userId]);
  });
}

describe("suppression d'un compte", () => {
  it("supprime les données personnelles et conserve l'historique de l'autre participant", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id);
    const { rows: conv } = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
    );
    const conversationId = conv[0]!.id;
    await asUser(buyer.id, (sql) =>
      sql("insert into public.messages (conversation_id, body) values ($1, 'Bonjour')", [
        conversationId,
      ]),
    );
    await asUser(seller.id, (sql) =>
      sql("insert into public.messages (conversation_id, body) values ($1, 'Oui ?')", [
        conversationId,
      ]),
    );
    await asUser(buyer.id, (sql) =>
      sql("insert into public.follows (following_id) values ($1)", [seller.id]),
    );
    await asUser(buyer.id, (sql) =>
      sql(
        "insert into public.reports (target_type, target_id, reason) values ('user', $1, 'spam')",
        [seller.id],
      ),
    );

    await deleteAuthUser(seller.id);

    const counts = await asOwner((sql) =>
      sql<Record<string, string>>(
        `select
           (select count(*) from public.profiles where id = $1) as profiles,
           (select count(*) from public.listings where seller_id = $1) as listings,
           (select count(*) from public.listing_images where listing_id = $2) as images,
           (select count(*) from public.follows where following_id = $1) as follows,
           (select count(*) from public.notifications where user_id = $1) as notifications`,
        [seller.id, listingId],
      ),
    );
    expect(counts.rows[0]).toEqual({
      profiles: "0",
      listings: "0",
      images: "0",
      follows: "0",
      notifications: "0",
    });

    // L'acheteur garde la conversation et les messages (auteur anonymisé).
    const { rows } = await asUser(buyer.id, (sql) =>
      sql<{ seller_id: string | null; listing_id: string | null; senders: (string | null)[] }>(
        `select c.seller_id, c.listing_id,
                array_agg(m.sender_id order by m.created_at) as senders
         from public.conversations c join public.messages m on m.conversation_id = c.id
         where c.id = $1 group by c.id`,
        [conversationId],
      ),
    );
    expect(rows[0]).toEqual({ seller_id: null, listing_id: null, senders: [buyer.id, null] });

    // Le signalement reste disponible pour la modération.
    const reports = await asOwner((sql) =>
      sql("select id from public.reports where target_id = $1", [seller.id]),
    );
    expect(reports.rows).toHaveLength(1);
  });
});
