import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOwner,
  asUser,
  createUser,
  expectDenied,
  expectError,
  makeAdmin,
  suspendUser,
} from "./support/db";

describe("création du profil à l'inscription", () => {
  it("crée profil, coordonnées privées et préférences", async () => {
    const user = await createUser({ username: "awa_237", display_name: "Awa" });
    const { rows } = await asOwner((sql) =>
      sql(
        `select p.username, p.display_name,
                exists (select 1 from public.profile_private where id = p.id) as has_private,
                (select followed_user_listing from public.notification_preferences where user_id = p.id) as followed
         from public.profiles p where p.id = $1`,
        [user.id],
      ),
    );
    expect(rows[0]).toEqual({
      username: "awa_237",
      display_name: "Awa",
      has_private: true,
      // Nouvelles annonces des profils suivis : activées par défaut (migration 20261021100000).
      followed: true,
    });
  });

  it("génère un nom unique si le nom demandé est pris, réservé ou invalide", async () => {
    const first = await createUser({ username: "doublon" });
    const second = await createUser({ username: "doublon" });
    const reserved = await createUser({ username: "admin" });
    const invalid = await createUser({ username: "Élodie M." });
    expect(first.username).toBe("doublon");
    expect(second.username).toMatch(/^doublon_\d{4}$/);
    expect(reserved.username).not.toBe("admin");
    expect(invalid.username).toMatch(/^elodiem/);
  });

  it("reprend le nom fourni par Google (full_name)", async () => {
    const user = await createUser({ full_name: "Jean Mbarga" });
    const { rows } = await asAnon((sql) =>
      sql("select display_name from public.profiles where id = $1", [user.id]),
    );
    expect(rows[0]).toEqual({ display_name: "Jean Mbarga" });
  });
});

describe("profiles", () => {
  it("est lisible publiquement", async () => {
    const user = await createUser();
    const { rows } = await asAnon((sql) =>
      sql("select username from public.profiles where id = $1", [user.id]),
    );
    expect(rows).toHaveLength(1);
  });

  it("permet de modifier ses propres champs publics", async () => {
    const user = await createUser();
    const { rowCount } = await asUser(user.id, (sql) =>
      sql(
        "update public.profiles set display_name = 'Nouveau nom', city = 'yaounde' where id = $1",
        [user.id],
      ),
    );
    expect(rowCount).toBe(1);
  });

  it("ne permet pas de modifier le profil d'un autre utilisateur", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const { rowCount } = await asUser(attacker.id, (sql) =>
      sql("update public.profiles set display_name = 'Piraté' where id = $1", [owner.id]),
    );
    expect(rowCount).toBe(0);
  });

  it("interdit de lever soi-même une suspension ou de changer d'identifiant", async () => {
    const user = await createUser();
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("update public.profiles set suspended_at = null where id = $1", [user.id]),
      ),
    );
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("update public.profiles set id = gen_random_uuid() where id = $1", [user.id]),
      ),
    );
  });

  it("interdit de créer ou supprimer un profil via l'API", async () => {
    const user = await createUser();
    await expectDenied(
      asUser(user.id, (sql) =>
        sql(
          "insert into public.profiles (id, username, display_name) values (gen_random_uuid(), 'x_x_x', 'X')",
        ),
      ),
    );
    await expectDenied(
      asUser(user.id, (sql) => sql("delete from public.profiles where id = $1", [user.id])),
    );
  });

  it("valide le format du nom d'utilisateur, l'avatar et la bio", async () => {
    const user = await createUser();
    await expectError(
      asUser(user.id, (sql) =>
        sql("update public.profiles set username = 'Majuscules' where id = $1", [user.id]),
      ),
      "23514",
    );
    await expectError(
      asUser(user.id, (sql) =>
        sql("update public.profiles set username = 'support' where id = $1", [user.id]),
      ),
      "23514",
    );
    await expectError(
      asUser(user.id, (sql) =>
        sql("update public.profiles set avatar_path = 'autre-dossier/photo.webp' where id = $1", [
          user.id,
        ]),
      ),
      "23514",
    );
    await expectError(
      asUser(user.id, (sql) =>
        sql("update public.profiles set bio = repeat('a', 501) where id = $1", [user.id]),
      ),
      "23514",
    );
  });

  it("refuse un nom d'utilisateur déjà pris", async () => {
    const first = await createUser();
    const second = await createUser();
    await expectError(
      asUser(second.id, (sql) =>
        sql("update public.profiles set username = $1 where id = $2", [first.username, second.id]),
      ),
      "23505",
    );
  });

  it("masque les comptes suspendus au public mais pas à leur titulaire", async () => {
    const user = await createUser();
    const other = await createUser();
    await suspendUser(user.id);
    const query = "select id from public.profiles where id = $1";
    expect((await asAnon((sql) => sql(query, [user.id]))).rows).toHaveLength(0);
    expect((await asUser(other.id, (sql) => sql(query, [user.id]))).rows).toHaveLength(0);
    expect((await asUser(user.id, (sql) => sql(query, [user.id]))).rows).toHaveLength(1);
  });

  it("indique la disponibilité d'un nom d'utilisateur", async () => {
    const user = await createUser();
    const { rows } = await asAnon((sql) =>
      sql(
        `select public.is_username_available($1) as taken,
                public.is_username_available('libre_' || floor(random() * 1e6)::text) as free,
                public.is_username_available('admin') as reserved,
                public.is_username_available('INVALIDE') as invalid`,
        [user.username],
      ),
    );
    expect(rows[0]).toEqual({ taken: false, free: true, reserved: false, invalid: false });
  });
});

describe("profile_private", () => {
  it("n'est visible que par son propriétaire", async () => {
    const owner = await createUser();
    const other = await createUser();
    await asUser(owner.id, (sql) =>
      sql("update public.profile_private set phone = '+237690000000' where id = $1", [owner.id]),
    );
    const query = "select phone from public.profile_private where id = $1";
    expect((await asUser(owner.id, (sql) => sql(query, [owner.id]))).rows).toEqual([
      { phone: "+237690000000" },
    ]);
    expect((await asUser(other.id, (sql) => sql(query, [owner.id]))).rows).toEqual([]);
    await expectDenied(asAnon((sql) => sql(query, [owner.id])));
  });

  it("ne peut pas être modifié par un autre utilisateur", async () => {
    const owner = await createUser();
    const other = await createUser();
    const { rowCount } = await asUser(other.id, (sql) =>
      sql("update public.profile_private set phone = '+237600000000' where id = $1", [owner.id]),
    );
    expect(rowCount).toBe(0);
  });

  it("valide le format international du numéro", async () => {
    const owner = await createUser();
    await expectError(
      asUser(owner.id, (sql) =>
        sql("update public.profile_private set phone = '690000000' where id = $1", [owner.id]),
      ),
      "23514",
    );
  });
});

describe("user_roles", () => {
  it("ne permet à personne de s'attribuer un rôle via l'API", async () => {
    const user = await createUser();
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("insert into public.user_roles (user_id, role) values ($1, 'admin')", [user.id]),
      ),
    );
  });

  it("permet à un administrateur de voir son rôle, pas celui des autres", async () => {
    const admin = await createUser();
    const user = await createUser();
    await makeAdmin(admin.id);
    expect(
      (await asUser(admin.id, (sql) => sql("select role from public.user_roles"))).rows,
    ).toEqual([{ role: "admin" }]);
    expect(
      (await asUser(user.id, (sql) => sql("select role from public.user_roles"))).rows,
    ).toEqual([]);
  });

  it("refuse la modification d'un rôle existant, même par un administrateur", async () => {
    const admin = await createUser();
    await makeAdmin(admin.id);
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql("delete from public.user_roles where user_id = $1", [admin.id]),
      ),
    );
  });
});

describe("notification_preferences", () => {
  it("sont privées et modifiables par leur propriétaire uniquement", async () => {
    const owner = await createUser();
    const other = await createUser();
    const query = "select new_message from public.notification_preferences where user_id = $1";
    expect((await asUser(other.id, (sql) => sql(query, [owner.id]))).rows).toEqual([]);
    const { rowCount } = await asUser(owner.id, (sql) =>
      sql("update public.notification_preferences set new_message = false where user_id = $1", [
        owner.id,
      ]),
    );
    expect(rowCount).toBe(1);
    const denied = await asUser(other.id, (sql) =>
      sql("update public.notification_preferences set new_message = true where user_id = $1", [
        owner.id,
      ]),
    );
    expect(denied.rowCount).toBe(0);
  });
});
