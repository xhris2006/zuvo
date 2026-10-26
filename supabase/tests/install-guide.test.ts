import { describe, expect, it } from "vitest";
import { asAnon, asUser, createUser, expectDenied, suspendUser } from "./support/db";

function request(userId: string) {
  return asUser(userId, (sql) =>
    sql<{ created: boolean }>("select public.request_install_guide() as created"),
  ).then(({ rows }) => rows[0]!.created);
}

async function guides(userId: string) {
  const { rows } = await asUser(userId, (sql) =>
    sql<{ id: string; actor_id: string | null; note: string | null; is_read: boolean }>(
      "select id, actor_id, note, is_read from public.notifications where type = 'install_guide'",
    ),
  );
  return rows;
}

describe("notification « installer l'application »", () => {
  it("est créée une seule fois pour le membre qui la demande", async () => {
    const member = await createUser();
    const other = await createUser();
    expect(await request(member.id)).toBe(true);
    expect(await request(member.id)).toBe(false);
    expect(await guides(member.id)).toEqual([
      { id: expect.any(String), actor_id: null, note: null, is_read: false },
    ]);
    // Aucun effet sur les autres membres.
    expect(await guides(other.id)).toEqual([]);
  });

  it("peut être redemandée après suppression (nouvel appareil)", async () => {
    const member = await createUser();
    await request(member.id);
    await asUser(member.id, (sql) =>
      sql("delete from public.notifications where type = 'install_guide'"),
    );
    expect(await request(member.id)).toBe(true);
    expect(await guides(member.id)).toHaveLength(1);
  });

  it("n'est créée ni pour un visiteur ni pour un compte suspendu", async () => {
    await expectDenied(asAnon((sql) => sql("select public.request_install_guide()")));
    const suspended = await createUser();
    await suspendUser(suspended.id);
    expect(await request(suspended.id)).toBe(false);
  });
});
