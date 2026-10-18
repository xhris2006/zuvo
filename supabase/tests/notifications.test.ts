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
  const subscribe = (userId: string, endpoint: string, ownerId?: string) =>
    asUser(userId, (sql) =>
      ownerId
        ? sql(
            "insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, 'cle', 'secret')",
            [ownerId, endpoint],
          )
        : sql(
            "insert into public.push_subscriptions (endpoint, p256dh, auth) values ($1, 'cle', 'secret')",
            [endpoint],
          ),
    );

  it("sont privées à leur propriétaire", async () => {
    const owner = await createUser();
    const other = await createUser();
    const endpoint = `https://push.example.test/${owner.id}`;
    await subscribe(owner.id, endpoint);
    const query = "select endpoint from public.push_subscriptions where endpoint = $1";
    expect((await asUser(owner.id, (sql) => sql(query, [endpoint]))).rows).toHaveLength(1);
    expect((await asUser(other.id, (sql) => sql(query, [endpoint]))).rows).toHaveLength(0);
    await expectDenied(asAnon((sql) => sql(query, [endpoint])));
  });

  it("ne peuvent pas être enregistrées pour un autre utilisateur", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    await expectDenied(subscribe(attacker.id, `https://push.example.test/x-${owner.id}`, owner.id));
  });

  it("exigent une URL HTTPS", async () => {
    const owner = await createUser();
    await expectError(subscribe(owner.id, "http://insecure.example.test"), "23514");
  });
});
