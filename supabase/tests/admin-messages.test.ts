import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createUser,
  expectDenied,
  expectError,
  makeAdmin,
  type Sql,
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

class Rollback<T> extends Error {
  constructor(readonly value: T) {
    super("rollback");
  }
}

/**
 * Exécute des requêtes comme `userId` dans une transaction annulée à la fin :
 * un message à tous ne doit pas atteindre les comptes créés par les autres
 * fichiers de tests, exécutés en parallèle sur la même base.
 */
async function withoutCommit<T>(userId: string, fn: (sql: Sql) => Promise<T>): Promise<T> {
  const outcome = await asUser(userId, async (sql) => {
    throw new Rollback(await fn(sql));
  }).catch((error: unknown) => error);
  if (outcome instanceof Rollback) return outcome.value as T;
  throw outcome;
}

/** Notifications « message de l'équipe » d'un membre, lues avec ses propres droits. */
async function teamMessages(userId: string) {
  const { rows } = await asUser(userId, (sql) =>
    sql<{ note: string; actor_id: string | null; is_read: boolean }>(
      "select note, actor_id, is_read from public.notifications where user_id = $1 and type = 'admin_message' order by created_at",
      [userId],
    ),
  );
  return rows;
}

describe("message de l'équipe à un membre", () => {
  it("arrive en notification non lue et s'inscrit au journal de modération", async () => {
    const moderator = await createModerator();
    const member = await createUser();
    await asUser(moderator.id, (sql) =>
      sql("select public.admin_message_user($1, $2)", [
        member.id,
        "  Bonjour, merci d'ajouter des photos à vos annonces.  ",
      ]),
    );

    expect(await teamMessages(member.id)).toEqual([
      {
        note: "Bonjour, merci d'ajouter des photos à vos annonces.",
        actor_id: null,
        is_read: false,
      },
    ]);
    const { rows } = await asOwner((sql) =>
      sql<{ admin_id: string; action: string; note: string }>(
        "select admin_id, action, note from public.moderation_actions where target_id = $1",
        [member.id],
      ),
    );
    expect(rows).toEqual([
      {
        admin_id: moderator.id,
        action: "user_messaged",
        note: "Bonjour, merci d'ajouter des photos à vos annonces.",
      },
    ]);
  });

  it("n'est lisible que par son destinataire", async () => {
    const admin = await createAdmin();
    const member = await createUser();
    const other = await createUser();
    await asUser(admin.id, (sql) =>
      sql("select public.admin_message_user($1, 'Message personnel')", [member.id]),
    );
    expect(await teamMessages(member.id)).toHaveLength(1);
    const { rows } = await asUser(other.id, (sql) =>
      sql("select id from public.notifications where user_id = $1", [member.id]),
    );
    expect(rows).toEqual([]);
  });

  it("est refusé hors de l'équipe, à soi-même, sans texte ou vers un compte inconnu", async () => {
    const moderator = await createModerator();
    const member = await createUser();
    const other = await createUser();
    const send = (senderId: string, userId: string, message: string) =>
      asUser(senderId, (sql) => sql("select public.admin_message_user($1, $2)", [userId, message]));

    await expectDenied(send(member.id, other.id, "Je me fais passer pour l'équipe"));
    await expectDenied(
      asAnon((sql) => sql("select public.admin_message_user($1, 'Bonjour à vous')", [member.id])),
    );
    await expectDenied(send(moderator.id, moderator.id, "Note pour moi-même"));
    await expectError(send(moderator.id, member.id, "  ok "), "22023");
    await expectError(send(moderator.id, member.id, "x".repeat(501)), "22023");
    await expectError(send(moderator.id, randomUUID(), "Bonjour à vous"), "P0002");
    expect(await teamMessages(member.id)).toEqual([]);
    expect(await teamMessages(other.id)).toEqual([]);
  });
});

describe("message de l'équipe à tous les membres", () => {
  it("arrive en notification à chaque membre, sauf l'expéditeur et les comptes suspendus", async () => {
    const admin = await createAdmin();
    const member = await createUser();
    const moderator = await createModerator();
    const suspended = await createUser();
    await suspendUser(suspended.id);
    const message = "Maintenance ce soir de 22 h à 23 h.";

    const result = await withoutCommit(admin.id, async (sql) => {
      const { rows } = await sql<{ count: number }>(
        "select public.admin_broadcast_message($1) as count",
        [message],
      );
      // Le destinataire lit sa notification avec ses propres droits.
      await sql("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: member.id, role: "authenticated" }),
      ]);
      const { rows: own } = await sql<{ note: string; actor_id: string | null }>(
        "select note, actor_id from public.notifications where type = 'admin_message'",
      );
      await sql("reset role");
      const { rows: sent } = await sql<{ user_id: string }>(
        "select user_id from public.notifications where type = 'admin_message' and note = $1",
        [message],
      );
      const { rows: activity } = await sql<{ entity: string; action: string; summary: string }>(
        "select entity, action, summary from public.admin_activity where admin_id = $1",
        [admin.id],
      );
      return { count: rows[0]!.count, own, recipients: sent.map((row) => row.user_id), activity };
    });

    expect(result.count).toBe(result.recipients.length);
    expect(result.recipients).toContain(member.id);
    expect(result.recipients).toContain(moderator.id);
    expect(result.recipients).not.toContain(admin.id);
    expect(result.recipients).not.toContain(suspended.id);
    expect(result.own).toEqual([{ note: message, actor_id: null }]);
    expect(result.activity).toHaveLength(1);
    expect(result.activity[0]).toMatchObject({ entity: "broadcast", action: "created" });
    expect(result.activity[0]!.summary).toContain(message);
  });

  it("n'est pas renvoyé par le même administrateur moins d'une minute après", async () => {
    const admin = await createAdmin();
    const error = await withoutCommit(admin.id, async (sql) => {
      await sql("select public.admin_broadcast_message('Premier envoi')");
      return sql("select public.admin_broadcast_message('Second envoi')").then(
        () => null,
        (caught: { code?: string; message?: string }) => caught,
      );
    });
    expect(error).toMatchObject({ code: "P0001", message: "broadcast_too_soon" });
  });

  it("est réservé aux administrateurs", async () => {
    const moderator = await createModerator();
    const member = await createUser();
    const message = `Message non autorisé ${randomUUID()}`;
    await expectDenied(
      asUser(moderator.id, (sql) => sql("select public.admin_broadcast_message($1)", [message])),
    );
    await expectDenied(
      asUser(member.id, (sql) => sql("select public.admin_broadcast_message($1)", [message])),
    );
    await expectDenied(
      asAnon((sql) => sql("select public.admin_broadcast_message($1)", [message])),
    );
    await expectError(
      asUser((await createAdmin()).id, (sql) => sql("select public.admin_broadcast_message('no')")),
      "22023",
    );
    const { rows } = await asOwner((sql) =>
      sql("select id from public.notifications where note = $1", [message]),
    );
    expect(rows).toEqual([]);
  });

  it("ne peut pas être écrit directement dans les notifications par un membre", async () => {
    const member = await createUser();
    const other = await createUser();
    await expectDenied(
      asUser(member.id, (sql) =>
        sql(
          "insert into public.notifications (user_id, type, note) values ($1, 'admin_message', 'Faux message')",
          [other.id],
        ),
      ),
    );
  });
});
