import { describe, expect, it } from "vitest";
import { asAnon, asOwner, asUser, createUser, expectDenied, expectError } from "./support/db";

async function notify(userId: string, actorId: string | null = null) {
  const { rows } = await asOwner((sql) =>
    sql<{ id: string }>(
      "insert into public.notifications (user_id, actor_id, type) values ($1, $2, 'new_follower') returning id",
      [userId, actorId],
    ),
  );
  return rows[0]!.id;
}

describe("notifications", () => {
  it("ne peuvent pas être créées par un utilisateur", async () => {
    const user = await createUser();
    const victim = await createUser();
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("insert into public.notifications (user_id, type) values ($1, 'new_follower')", [
          victim.id,
        ]),
      ),
    );
  });

  it("ne sont visibles que par leur destinataire", async () => {
    const owner = await createUser();
    const other = await createUser();
    const notificationId = await notify(owner.id);
    const query = "select id from public.notifications where id = $1";
    expect((await asUser(owner.id, (sql) => sql(query, [notificationId]))).rows).toHaveLength(1);
    expect((await asUser(other.id, (sql) => sql(query, [notificationId]))).rows).toHaveLength(0);
    await expectDenied(asAnon((sql) => sql(query, [notificationId])));
  });

  it("peuvent être marquées comme lues individuellement ou globalement", async () => {
    const owner = await createUser();
    const first = await notify(owner.id);
    await notify(owner.id);
    await notify(owner.id);
    const single = await asUser(owner.id, (sql) =>
      sql("update public.notifications set is_read = true where id = $1", [first]),
    );
    expect(single.rowCount).toBe(1);
    const all = await asUser(owner.id, (sql) =>
      sql<{ count: number }>("select public.mark_all_notifications_read() as count"),
    );
    expect(all.rows[0]).toEqual({ count: 2 });
  });

  it("gardent le résultat de l'envoi push, que le destinataire peut lire sans le modifier", async () => {
    const owner = await createUser();
    const notificationId = await notify(owner.id);
    await asOwner((sql) =>
      sql(
        "update public.notifications set pushed_at = now(), push_status = 'failed', push_detail = 'HTTP 403' where id = $1",
        [notificationId],
      ),
    );
    const { rows } = await asUser(owner.id, (sql) =>
      sql<{ push_status: string; push_detail: string }>(
        "select push_status, push_detail from public.notifications where id = $1",
        [notificationId],
      ),
    );
    expect(rows[0]).toEqual({ push_status: "failed", push_detail: "HTTP 403" });
    await expectDenied(
      asUser(owner.id, (sql) =>
        sql("update public.notifications set push_status = 'sent' where id = $1", [notificationId]),
      ),
    );
    await expectError(
      asOwner((sql) =>
        sql("update public.notifications set push_status = 'inconnu' where id = $1", [
          notificationId,
        ]),
      ),
      "23514",
    );
  });

  it("ne peuvent être ni lues ni modifiées pour le compte d'un autre", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const notificationId = await notify(owner.id);
    const updated = await asUser(attacker.id, (sql) =>
      sql("update public.notifications set is_read = true where id = $1", [notificationId]),
    );
    const deleted = await asUser(attacker.id, (sql) =>
      sql("delete from public.notifications where id = $1", [notificationId]),
    );
    expect(updated.rowCount).toBe(0);
    expect(deleted.rowCount).toBe(0);
    await expectDenied(
      asUser(owner.id, (sql) =>
        sql("update public.notifications set user_id = $2 where id = $1", [
          notificationId,
          attacker.id,
        ]),
      ),
    );
  });
});

describe("push_subscriptions", () => {
  const register = (userId: string, endpoint: string) =>
    asUser(userId, (sql) =>
      sql("select public.register_push_subscription($1, 'cle', 'secret')", [endpoint]),
    );

  it("sont privées à leur propriétaire", async () => {
    const owner = await createUser();
    const other = await createUser();
    const endpoint = `https://fcm.googleapis.com/fcm/send/${owner.id}`;
    await register(owner.id, endpoint);
    const query = "select endpoint from public.push_subscriptions where endpoint = $1";
    expect((await asUser(owner.id, (sql) => sql(query, [endpoint]))).rows).toHaveLength(1);
    expect((await asUser(other.id, (sql) => sql(query, [endpoint]))).rows).toHaveLength(0);
    await expectDenied(asAnon((sql) => sql(query, [endpoint])));
  });

  it("ne s'enregistrent que par la fonction dédiée, pour soi-même", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    for (const [query, values] of [
      [
        "insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, 'cle', 'secret')",
        [owner.id, `https://fcm.googleapis.com/fcm/send/x-${owner.id}`],
      ],
      [
        "insert into public.push_subscriptions (endpoint, p256dh, auth) values ($1, 'cle', 'secret')",
        [`https://fcm.googleapis.com/fcm/send/y-${owner.id}`],
      ],
    ] as const) {
      await expectDenied(asUser(attacker.id, (sql) => sql(query, [...values])));
    }
  });

  it("exigent un service push HTTPS connu", async () => {
    const owner = await createUser();
    await expectError(register(owner.id, "http://insecure.example.test"), "23514");
  });
});
