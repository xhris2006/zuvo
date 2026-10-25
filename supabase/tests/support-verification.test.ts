import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createUser,
  expectDenied,
  expectError,
  makeAdmin,
  suspendUser,
} from "./support/db";

async function createAdmin() {
  const admin = await createUser();
  await makeAdmin(admin.id);
  return admin;
}

async function createModerator() {
  const moderator = await createUser();
  await asOwner((sql) =>
    sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [moderator.id]),
  );
  return moderator;
}

async function journal(targetId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ action: string; note: string | null }>(
      "select action, note from public.moderation_actions where target_id = $1 order by created_at",
      [targetId],
    ),
  );
  return rows;
}

function contact(userId: string, subject = "Question sur mon compte") {
  return asUser(userId, (sql) =>
    sql<{ id: string }>(
      "insert into public.support_requests (subject, message) values ($1, 'Bonjour, comment changer mon pseudo ?') returning id",
      [subject],
    ),
  );
}

async function removedListing(sellerId: string) {
  const listingId = await createActiveListing(sellerId);
  await asOwner((sql) =>
    sql(
      "update public.listings set removed_at = now(), removed_reason = 'Contrefaçon', status = 'withdrawn' where id = $1",
      [listingId],
    ),
  );
  return listingId;
}

function appeal(userId: string, listingId: string) {
  return asUser(userId, (sql) =>
    sql<{ id: string }>(
      `insert into public.support_requests (kind, listing_id, subject, message)
       values ('appeal', $1, 'Contestation du retrait', 'Cet article est authentique, facture à l''appui.')
       returning id`,
      [listingId],
    ),
  );
}

describe("badge vendeur vérifié", () => {
  it("est attribué puis retiré par un administrateur, visible de tous et journalisé", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_seller_verification($1, true, $2)", [
        seller.id,
        "Pièce d'identité vérifiée en agence",
      ]),
    );
    const { rows } = await asAnon((sql) =>
      sql<{ verified_at: string | null }>("select verified_at from public.profiles where id = $1", [
        seller.id,
      ]),
    );
    expect(rows[0]!.verified_at).not.toBeNull();

    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_seller_verification($1, false)", [seller.id]),
    );
    expect(await journal(seller.id)).toEqual([
      { action: "seller_verified", note: "Pièce d'identité vérifiée en agence" },
      { action: "seller_unverified", note: null },
    ]);
    // Déjà retiré : rien à faire.
    await expectError(
      asUser(admin.id, (sql) =>
        sql("select public.admin_set_seller_verification($1, false)", [seller.id]),
      ),
      "P0002",
    );
  });

  it("ne peut être ni attribué par l'équipe non administratrice ni modifié par le vendeur", async () => {
    const admin = await createAdmin();
    const moderator = await createModerator();
    const seller = await createUser();
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("select public.admin_set_seller_verification($1, true)", [seller.id]),
      ),
    );
    await expectDenied(
      asUser(seller.id, (sql) =>
        sql("update public.profiles set verified_at = now() where id = $1", [seller.id]),
      ),
    );
    await suspendUser(seller.id);
    await expectError(
      asUser(admin.id, (sql) =>
        sql("select public.admin_set_seller_verification($1, true)", [seller.id]),
      ),
      "22023",
    );
  });
});

describe("demandes d'assistance", () => {
  it("restent privées entre leur auteur et l'équipe", async () => {
    const author = await createUser();
    const other = await createUser();
    const moderator = await createModerator();
    const { rows } = await contact(author.id);
    const requestId = rows[0]!.id;

    const query = "select id, status from public.support_requests where id = $1";
    expect((await asUser(author.id, (sql) => sql(query, [requestId]))).rows).toEqual([
      { id: requestId, status: "open" },
    ]);
    expect((await asUser(other.id, (sql) => sql(query, [requestId]))).rows).toEqual([]);
    expect((await asUser(moderator.id, (sql) => sql(query, [requestId]))).rows).toHaveLength(1);
    await expectDenied(asAnon((sql) => sql(query, [requestId])));
  });

  it("refuse l'usurpation, la modification et les visiteurs", async () => {
    const author = await createUser();
    const other = await createUser();
    await expectDenied(
      asUser(other.id, (sql) =>
        sql(
          "insert into public.support_requests (user_id, subject, message) values ($1, 'Usurpation', 'Message au nom d''un autre')",
          [author.id],
        ),
      ),
    );
    const { rows } = await contact(author.id);
    await expectDenied(
      asUser(author.id, (sql) =>
        sql("update public.support_requests set status = 'closed' where id = $1", [rows[0]!.id]),
      ),
    );
    await expectDenied(
      asAnon((sql) =>
        sql(
          "insert into public.support_requests (subject, message) values ('Spam', 'Message anonyme')",
        ),
      ),
    );
  });

  it("limite à 5 demandes par jour et reste ouverte à un compte suspendu", async () => {
    const author = await createUser();
    await suspendUser(author.id);
    for (let index = 0; index < 5; index += 1) await contact(author.id, `Demande ${index + 1}`);
    await expectError(contact(author.id, "Demande 6"), "PT429");
  });

  it("permet de contester le retrait de sa propre annonce, une fois à la fois", async () => {
    const seller = await createUser();
    const other = await createUser();
    const removed = await removedListing(seller.id);
    const online = await createActiveListing(seller.id, { title: "Annonce en ligne" });

    const { rows } = await appeal(seller.id, removed);
    expect(rows).toHaveLength(1);
    await expectError(appeal(seller.id, removed), "23505");
    await expectError(appeal(seller.id, online), "P0002");
    await expectError(appeal(other.id, removed), "P0002");
  });

  it("répond depuis l'équipe : notification, journal, clôture", async () => {
    const author = await createUser();
    const moderator = await createModerator();
    const { rows } = await contact(author.id, "Paiement d'un acheteur");
    const requestId = rows[0]!.id;

    await expectError(
      asUser(moderator.id, (sql) =>
        sql("select public.admin_answer_support_request($1, '  ')", [requestId]),
      ),
      "22023",
    );
    await asUser(moderator.id, (sql) =>
      sql("select public.admin_answer_support_request($1, $2)", [
        requestId,
        "Ne payez jamais avant d'avoir vu l'article.",
      ]),
    );
    const { rows: request } = await asUser(author.id, (sql) =>
      sql("select status, response from public.support_requests where id = $1", [requestId]),
    );
    expect(request[0]).toEqual({
      status: "answered",
      response: "Ne payez jamais avant d'avoir vu l'article.",
    });
    const { rows: notifications } = await asUser(author.id, (sql) =>
      sql("select type, note from public.notifications where user_id = $1", [author.id]),
    );
    expect(notifications).toEqual([{ type: "support_reply", note: "Paiement d'un acheteur" }]);

    await asUser(moderator.id, (sql) =>
      sql("select public.admin_answer_support_request($1, null, true)", [requestId]),
    );
    await expectError(
      asUser(moderator.id, (sql) =>
        sql("select public.admin_answer_support_request($1, 'Encore', false)", [requestId]),
      ),
      "P0002",
    );
    expect((await journal(author.id)).map((entry) => entry.note)).toEqual([
      "Demande « Paiement d'un acheteur » : réponse envoyée",
      "Demande « Paiement d'un acheteur » : clôture",
    ]);

    const user = await createUser();
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("select public.admin_answer_support_request($1, 'Réponse')", [requestId]),
      ),
    );
  });
});
