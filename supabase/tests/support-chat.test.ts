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

async function createModerator() {
  const moderator = await createUser();
  await asOwner((sql) =>
    sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [moderator.id]),
  );
  return moderator;
}

async function createRequest(userId: string, subject = "Question sur une vente") {
  const { rows } = await asUser(userId, (sql) =>
    sql<{ id: string }>(
      "insert into public.support_requests (subject, message) values ($1, 'Bonjour, j''ai une question.') returning id",
      [subject],
    ),
  );
  return rows[0]!.id;
}

function write(userId: string, requestId: string, body: string) {
  return asUser(userId, (sql) =>
    sql<{ from_staff: boolean }>(
      "insert into public.support_messages (request_id, body) values ($1, $2) returning from_staff",
      [requestId, body],
    ),
  );
}

/**
 * Notifications d'un compte causées par un acteur précis : les autres fichiers
 * de tests, exécutés en parallèle, notifient aussi l'équipe.
 */
async function notificationsOf(userId: string, actorId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ type: string; note: string | null; support_request_id: string | null }>(
      `select type::text, note, support_request_id from public.notifications
       where user_id = $1 and actor_id is not distinct from $2 order by created_at`,
      [userId, actorId],
    ),
  );
  return rows;
}

/** Notifications reçues par l'auteur d'une demande (réponses de l'équipe). */
async function repliesTo(userId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ type: string; note: string | null; support_request_id: string | null }>(
      `select type::text, note, support_request_id from public.notifications
       where user_id = $1 order by created_at`,
      [userId],
    ),
  );
  return rows;
}

async function statusOf(requestId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ status: string }>("select status from public.support_requests where id = $1", [
      requestId,
    ]),
  );
  return rows[0]!.status;
}

describe("conversations d'assistance", () => {
  it("une nouvelle demande prévient l'équipe active, pas les membres ni l'équipe suspendue", async () => {
    const moderator = await createModerator();
    const admin = await createUser();
    await makeAdmin(admin.id);
    const suspended = await createModerator();
    await suspendUser(suspended.id);
    const bystander = await createUser();
    const author = await createUser();

    const requestId = await createRequest(author.id, "Compte bloqué");
    const expected = [
      { type: "support_message", note: "Compte bloqué", support_request_id: requestId },
    ];
    expect(await notificationsOf(moderator.id, author.id)).toEqual(expected);
    expect(await notificationsOf(admin.id, author.id)).toEqual(expected);
    expect(await repliesTo(suspended.id)).toEqual([]);
    expect(await repliesTo(bystander.id)).toEqual([]);
    expect(await repliesTo(author.id)).toEqual([]);
  });

  it("le membre et l'équipe échangent ; l'état et les notifications suivent", async () => {
    const moderator = await createModerator();
    const author = await createUser();
    const requestId = await createRequest(author.id, "Remboursement");

    // Le membre ne peut pas se faire passer pour l'équipe : la base décide.
    expect((await write(author.id, requestId, "Avez-vous reçu ma demande ?")).rows).toEqual([
      { from_staff: false },
    ]);
    // Une seule notification non lue par demande pour chaque membre de l'équipe.
    expect(await notificationsOf(moderator.id, author.id)).toHaveLength(1);

    expect((await write(moderator.id, requestId, "Oui, nous regardons.")).rows).toEqual([
      { from_staff: true },
    ]);
    expect(await statusOf(requestId)).toBe("answered");
    expect(await repliesTo(author.id)).toEqual([
      { type: "support_reply", note: "Remboursement", support_request_id: requestId },
    ]);

    await write(author.id, requestId, "Merci, j'attends votre retour.");
    expect(await statusOf(requestId)).toBe("open");

    const { rows } = await asUser(author.id, (sql) =>
      sql<{ body: string; from_staff: boolean }>(
        "select body, from_staff from public.support_messages where request_id = $1 order by created_at",
        [requestId],
      ),
    );
    expect(rows).toEqual([
      { body: "Avez-vous reçu ma demande ?", from_staff: false },
      { body: "Oui, nous regardons.", from_staff: true },
      { body: "Merci, j'attends votre retour.", from_staff: false },
    ]);
  });

  it("reste privée : ni un autre membre ni un visiteur ne lit ou n'écrit", async () => {
    const author = await createUser();
    const other = await createUser();
    const requestId = await createRequest(author.id);
    await write(author.id, requestId, "Message privé");

    const query = "select id from public.support_messages where request_id = $1";
    expect((await asUser(other.id, (sql) => sql(query, [requestId]))).rows).toEqual([]);
    await expectDenied(asAnon((sql) => sql(query, [requestId])));
    await expectError(write(other.id, requestId, "Intrusion"), "P0002");
    await expectDenied(
      asAnon((sql) =>
        sql("insert into public.support_messages (request_id, body) values ($1, 'Anonyme')", [
          requestId,
        ]),
      ),
    );
  });

  it("refuse l'usurpation, la modification, la suppression et le marquage équipe", async () => {
    const author = await createUser();
    const moderator = await createModerator();
    const requestId = await createRequest(author.id);
    await write(author.id, requestId, "Premier message");

    await expectDenied(
      asUser(author.id, (sql) =>
        sql(
          "insert into public.support_messages (request_id, body, from_staff) values ($1, 'Faux', true)",
          [requestId],
        ),
      ),
    );
    await expectDenied(
      asUser(author.id, (sql) =>
        sql(
          "insert into public.support_messages (request_id, author_id, body) values ($1, $2, 'Faux')",
          [requestId, moderator.id],
        ),
      ),
    );
    await expectDenied(
      asUser(author.id, (sql) =>
        sql("update public.support_messages set body = 'Modifié' where request_id = $1", [
          requestId,
        ]),
      ),
    );
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("delete from public.support_messages where request_id = $1", [requestId]),
      ),
    );
  });

  it("n'accepte plus de message une fois la demande close", async () => {
    const author = await createUser();
    const moderator = await createModerator();
    const requestId = await createRequest(author.id);
    await asUser(moderator.id, (sql) =>
      sql("select public.admin_answer_support_request($1, null, true)", [requestId]),
    );
    await expectError(write(author.id, requestId, "Encore une question"), "22023");
    await expectError(write(moderator.id, requestId, "Réponse tardive"), "22023");
  });

  it("limite à 50 messages par jour pour un membre", async () => {
    const author = await createUser();
    const requestId = await createRequest(author.id);
    await asUser(author.id, async (sql) => {
      for (let index = 1; index <= 50; index += 1) {
        await sql("insert into public.support_messages (request_id, body) values ($1, $2)", [
          requestId,
          `Message ${index}`,
        ]);
      }
    });
    await expectError(write(author.id, requestId, "Message de trop"), "PT429");
  });
});

describe("alertes de l'équipe", () => {
  it("un signalement prévient l'équipe avec son motif et l'annonce visée", async () => {
    const moderator = await createModerator();
    const seller = await createUser();
    const reporter = await createUser();
    const listingId = await createActiveListing(seller.id);

    await asUser(reporter.id, (sql) =>
      sql(
        "insert into public.reports (target_type, target_id, reason) values ('listing', $1, 'spam')",
        [listingId],
      ),
    );
    const { rows } = await asUser(moderator.id, (sql) =>
      sql<{ type: string; note: string; listing_id: string; actor_id: string }>(
        "select type::text, note, listing_id, actor_id from public.notifications where user_id = $1 and actor_id = $2",
        [moderator.id, reporter.id],
      ),
    );
    expect(rows).toEqual([
      { type: "staff_report", note: "spam", listing_id: listingId, actor_id: reporter.id },
    ]);
    expect(await repliesTo(seller.id)).toEqual([]);
    expect(await repliesTo(reporter.id)).toEqual([]);
  });

  it("une publication bloquée par l'anti-spam n'alerte l'équipe que si la base le confirme", async () => {
    const admin = await createUser();
    await makeAdmin(admin.id);
    const moderator = await createModerator();
    const member = await createUser();
    const word = `arnaquezz${Date.now().toString(36)}`;
    await asUser(admin.id, (sql) =>
      sql("insert into public.banned_words (word) values ($1)", [word]),
    );
    try {
      const report = (title: string) =>
        asUser(member.id, (sql) =>
          sql<{ reported: boolean }>(
            "select public.report_spam_block($1, 'Description') as reported",
            [title],
          ),
        );
      // Texte autorisé : rien n'est signalé (pas de fausse alerte).
      expect((await report("Chaise en bois")).rows).toEqual([{ reported: false }]);
      expect(await notificationsOf(moderator.id, member.id)).toEqual([]);

      expect((await report(`Montre ${word}`)).rows).toEqual([{ reported: true }]);
      expect(await notificationsOf(moderator.id, member.id)).toEqual([
        { type: "staff_report", note: "spam_banned_word", support_request_id: null },
      ]);
      // Au plus une alerte par membre et par heure.
      expect((await report(`Montre ${word}`)).rows).toEqual([{ reported: false }]);
      expect(await notificationsOf(moderator.id, member.id)).toHaveLength(1);
    } finally {
      await asOwner((sql) => sql("delete from public.banned_words where word = $1", [word]));
    }

    await expectDenied(
      asAnon((sql) => sql("select public.report_spam_block('Montre', 'Description')")),
    );
  });

  it("ne laisse personne écrire directement une notification de l'équipe", async () => {
    const member = await createUser();
    const moderator = await createModerator();
    await expectDenied(
      asUser(member.id, (sql) =>
        sql(
          "insert into public.notifications (user_id, type, note) values ($1, 'staff_report', 'spam')",
          [moderator.id],
        ),
      ),
    );
    await expectDenied(
      asUser(member.id, (sql) =>
        sql("select private.notify_staff('staff_report', null, null, null, 'x')"),
      ),
    );
  });
});
