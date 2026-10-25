import { describe, expect, it } from "vitest";
import { cities as staticCities } from "@/config/locations";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createUser,
  expectDenied,
  expectError,
  makeAdmin,
  type TestUser,
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
    sql<{ action: string; admin_id: string | null; note: string | null }>(
      "select action, admin_id, note from public.moderation_actions where target_id = $1 order by created_at",
      [targetId],
    ),
  );
  return rows;
}

const isSuspended = async (userId: string) =>
  (
    await asOwner((sql) =>
      sql<{ suspended: boolean }>("select private.is_suspended($1) as suspended", [userId]),
    )
  ).rows[0]!.suspended;

const visibleToAnon = async (user: TestUser) =>
  (await asAnon((sql) => sql("select id from public.profiles where id = $1", [user.id]))).rows
    .length === 1;

describe("rôle modérateur", () => {
  it("traite annonces, signalements et comptes", async () => {
    const moderator = await createModerator();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);

    await asUser(moderator.id, (sql) =>
      sql("select public.admin_remove_listing($1, $2)", [listingId, "Article interdit"]),
    );
    // L'équipe voit l'annonce retirée, le public non.
    const query = "select id from public.listings where id = $1";
    expect((await asUser(moderator.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(1);
    expect((await asAnon((sql) => sql(query, [listingId]))).rows).toHaveLength(0);

    await asUser(moderator.id, (sql) =>
      sql("select public.admin_restore_listing($1)", [listingId]),
    );
    await asUser(moderator.id, (sql) =>
      sql("select public.admin_warn_user($1, $2)", [seller.id, "Restez courtois"]),
    );
    const { rows: stats } = await asUser(moderator.id, (sql) =>
      sql<{ stats: { users: number } }>("select public.admin_get_stats() as stats"),
    );
    expect(stats[0]!.stats.users).toBeGreaterThan(0);
    await asUser(moderator.id, (sql) => sql("select * from public.admin_list_reports('pending')"));

    expect((await journal(listingId)).map((entry) => entry.action)).toEqual([
      "listing_removed",
      "listing_restored",
    ]);
    // Le journal de modération lui est lisible.
    const { rows: log } = await asUser(moderator.id, (sql) =>
      sql("select id from public.moderation_actions where target_id = $1", [listingId]),
    );
    expect(log).toHaveLength(2);
  });

  it("n'a accès ni aux rôles, ni aux suppressions, ni à la configuration", async () => {
    const moderator = await createModerator();
    const user = await createUser();
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("select public.admin_set_role($1, 'moderator', true)", [user.id]),
      ),
    );
    await expectDenied(
      asUser(moderator.id, (sql) => sql("select public.admin_check_user_deletion($1)", [user.id])),
    );
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("insert into public.categories (slug, name) values ('test-mod', 'Test')"),
      ),
    );
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("insert into public.cities (slug, name) values ('test-mod', 'Test')"),
      ),
    );
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("insert into public.site_announcements (message) values ('Bonjour à tous')"),
      ),
    );
    const updated = await asUser(moderator.id, (sql) =>
      sql("update public.categories set name = 'Piraté' where slug = 'autres'"),
    );
    expect(updated.rowCount).toBe(0);
    const { rows: activity } = await asUser(moderator.id, (sql) =>
      sql("select id from public.admin_activity"),
    );
    expect(activity).toEqual([]);
  });

  it("ne peut agir ni sur un administrateur ni sur un autre modérateur", async () => {
    const moderator = await createModerator();
    const otherModerator = await createModerator();
    const admin = await createAdmin();
    for (const target of [otherModerator, admin]) {
      await expectDenied(
        asUser(moderator.id, (sql) =>
          sql("select public.admin_set_user_suspension($1, true, $2)", [target.id, "Abus"]),
        ),
      );
    }
    // Un administrateur ne peut pas non plus sanctionner un modérateur.
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql("select public.admin_warn_user($1, $2)", [moderator.id, "Attention"]),
      ),
    );
  });

  it("voit les rôles de l'équipe, contrairement aux utilisateurs", async () => {
    const moderator = await createModerator();
    const admin = await createAdmin();
    const user = await createUser();
    const query = "select user_id from public.user_roles where user_id = $1";
    expect((await asUser(moderator.id, (sql) => sql(query, [admin.id]))).rows).toHaveLength(1);
    expect((await asUser(user.id, (sql) => sql(query, [admin.id]))).rows).toHaveLength(0);
  });
});

describe("suspension temporaire", () => {
  it("masque le compte jusqu'à la date de fin puis le rétablit automatiquement", async () => {
    const moderator = await createModerator();
    const user = await createUser();
    await asUser(moderator.id, (sql) =>
      sql(
        "select public.admin_set_user_suspension($1, true, $2, null, now() + interval '3 days')",
        [user.id, "Spam répété"],
      ),
    );
    expect(await isSuspended(user.id)).toBe(true);
    expect(await visibleToAnon(user)).toBe(false);
    expect((await journal(user.id)).at(-1)?.note).toMatch(/^Spam répété \(jusqu'au /);

    // La date de fin est atteinte : effet levé immédiatement, avant tout nettoyage.
    await asOwner((sql) =>
      sql(
        "update public.profiles set suspended_at = now() - interval '2 days', suspended_until = now() - interval '1 minute' where id = $1",
        [user.id],
      ),
    );
    expect(await isSuspended(user.id)).toBe(false);
    expect(await visibleToAnon(user)).toBe(true);

    // Le nettoyage remet les colonnes à zéro et l'inscrit au journal.
    const { rows } = await asUser(moderator.id, (sql) =>
      sql<{ lifted: number }>("select public.admin_lift_expired_suspensions() as lifted"),
    );
    expect(rows[0]!.lifted).toBeGreaterThanOrEqual(1);
    const { rows: profile } = await asOwner((sql) =>
      sql("select suspended_at, suspended_until from public.profiles where id = $1", [user.id]),
    );
    expect(profile[0]).toEqual({ suspended_at: null, suspended_until: null });
    expect((await journal(user.id)).at(-1)).toMatchObject({
      action: "user_unsuspended",
      admin_id: null,
    });
  });

  it("refuse une date de fin passée ou trop lointaine, et le nettoyage aux utilisateurs", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    for (const until of ["now() - interval '1 hour'", "now() + interval '2 years'"]) {
      await expectError(
        asUser(admin.id, (sql) =>
          sql(`select public.admin_set_user_suspension($1, true, 'Spam', null, ${until})`, [
            user.id,
          ]),
        ),
        "22023",
      );
    }
    expect(await isSuspended(user.id)).toBe(false);
    await expectDenied(
      asUser(user.id, (sql) => sql("select public.admin_lift_expired_suspensions()")),
    );
  });

  it("garde la suspension définitive sans date de fin", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_user_suspension($1, true, $2)", [user.id, "Arnaque"]),
    );
    expect(await isSuspended(user.id)).toBe(true);
    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_user_suspension($1, false)", [user.id]),
    );
    expect(await isSuspended(user.id)).toBe(false);
  });
});

describe("attribution des rôles", () => {
  it("permet à un administrateur de nommer puis retirer un modérateur, journalisé", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_role($1, 'moderator', true)", [user.id]),
    );
    // Le nouveau modérateur accède aux outils de l'équipe.
    await asUser(user.id, (sql) => sql("select public.admin_get_stats()"));

    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_role($1, 'moderator', false)", [user.id]),
    );
    await expectDenied(asUser(user.id, (sql) => sql("select public.admin_get_stats()")));
    expect((await journal(user.id)).map(({ action, note }) => [action, note])).toEqual([
      ["role_granted", "Modérateur"],
      ["role_revoked", "Modérateur"],
    ]);
  });

  it("refuse de modifier son propre rôle, un rôle inchangé et les non-administrateurs", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql("select public.admin_set_role($1, 'admin', false)", [admin.id]),
      ),
    );
    await expectError(
      asUser(admin.id, (sql) => sql("select public.admin_set_role($1, 'admin', false)", [user.id])),
      "P0002",
    );
    await expectDenied(
      asUser(user.id, (sql) => sql("select public.admin_set_role($1, 'admin', true)", [user.id])),
    );
    await expectDenied(
      asAnon((sql) => sql("select public.admin_set_role($1, 'admin', true)", [user.id])),
    );
    // Écriture directe toujours impossible.
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql("insert into public.user_roles (user_id, role) values ($1, 'admin')", [user.id]),
      ),
    );
  });
});

describe("suppression d'un compte par l'administration", () => {
  it("vérifie la demande puis journalise une fois le compte supprimé", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const { rows } = await asUser(admin.id, (sql) =>
      sql<{ username: string }>("select public.admin_check_user_deletion($1) as username", [
        user.id,
      ]),
    );
    expect(rows[0]!.username).toBe(user.username);

    // Tant que le compte existe, rien n'est inscrit.
    await expectError(
      asUser(admin.id, (sql) =>
        sql("select public.admin_log_user_deletion($1, $2, $3)", [
          user.id,
          user.username,
          "Fraude",
        ]),
      ),
      "22023",
    );
    await asOwner((sql) => sql("delete from auth.users where id = $1", [user.id]));
    await asUser(admin.id, (sql) =>
      sql("select public.admin_log_user_deletion($1, $2, $3)", [
        user.id,
        `${user.username}'); drop table x; --`,
        "Fraude avérée",
      ]),
    );
    const entry = (await journal(user.id)).at(-1)!;
    expect(entry.action).toBe("user_deleted");
    expect(entry.note).toMatch(/^Fraude avérée \(@[a-z0-9_]+\)$/);
  });

  it("refuse l'équipe, soi-même, les modérateurs et les utilisateurs", async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();
    const moderator = await createModerator();
    const user = await createUser();
    for (const target of [admin, otherAdmin, moderator]) {
      await expectDenied(
        asUser(admin.id, (sql) => sql("select public.admin_check_user_deletion($1)", [target.id])),
      );
    }
    for (const actor of [moderator, user]) {
      await expectDenied(
        asUser(actor.id, (sql) =>
          sql("select public.admin_log_user_deletion($1, 'x', 'Fraude')", [user.id]),
        ),
      );
    }
  });
});

describe("catégories et villes gérées par l'administration", () => {
  it("permet d'ajouter, renommer et désactiver une catégorie, avec journal", async () => {
    const admin = await createAdmin();
    const slug = `cat-${Date.now()}`;
    await asUser(admin.id, (sql) =>
      sql("insert into public.categories (slug, name, sort_order) values ($1, 'Animaux', 990)", [
        slug,
      ]),
    );
    await asUser(admin.id, (sql) =>
      sql("update public.categories set name = 'Animalerie', is_active = false where slug = $1", [
        slug,
      ]),
    );
    // Une catégorie désactivée n'est visible que de l'administration.
    const query = "select name from public.categories where slug = $1";
    expect((await asAnon((sql) => sql(query, [slug]))).rows).toEqual([]);
    expect((await asUser(admin.id, (sql) => sql(query, [slug]))).rows).toEqual([
      { name: "Animalerie" },
    ]);

    const { rows } = await asUser(admin.id, (sql) =>
      sql<{ action: string; summary: string; admin_id: string }>(
        `select a.action, a.summary, a.admin_id from public.admin_activity a
         join public.categories c on c.id::text = a.entity_id
         where c.slug = $1 order by a.created_at`,
        [slug],
      ),
    );
    expect(rows).toEqual([
      { action: "created", summary: "Animaux", admin_id: admin.id },
      { action: "updated", summary: "Animalerie (is_active, name)", admin_id: admin.id },
    ]);
  });

  it("refuse les modifications aux utilisateurs et aux visiteurs", async () => {
    const user = await createUser();
    const updated = await asUser(user.id, (sql) =>
      sql("update public.categories set name = 'Piraté' where slug = 'autres'"),
    );
    expect(updated.rowCount).toBe(0);
    await expectDenied(asAnon((sql) => sql("update public.cities set name = 'x'")));
    await expectDenied(
      asUser(user.id, (sql) => sql("insert into public.cities (slug, name) values ('x', 'X')")),
    );
    // Le slug d'une catégorie n'est pas modifiable (liens existants).
    const admin = await createAdmin();
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql("update public.categories set slug = 'x' where slug = 'autres'"),
      ),
    );
  });

  it("reprend exactement les villes de l'application, modifiables par l'administration", async () => {
    const { rows } = await asAnon((sql) =>
      sql<{ slug: string; name: string; region: string }>(
        "select slug, name, region from public.cities order by sort_order",
      ),
    );
    expect(rows.filter((row) => staticCities.some((city) => city.slug === row.slug))).toEqual(
      staticCities.map(({ slug, name, region }) => ({ slug, name, region })),
    );

    const admin = await createAdmin();
    const slug = `ville-${Date.now()}`;
    await asUser(admin.id, (sql) =>
      sql(
        "insert into public.cities (slug, name, region, is_active) values ($1, 'Lolodorf', 'Sud', false)",
        [slug],
      ),
    );
    const query = "select slug from public.cities where slug = $1";
    expect((await asAnon((sql) => sql(query, [slug]))).rows).toEqual([]);
    expect((await asUser(admin.id, (sql) => sql(query, [slug]))).rows).toEqual([{ slug }]);
    await expectError(
      asUser(admin.id, (sql) =>
        sql("insert into public.cities (slug, name) values ('Pas Valide', 'X')"),
      ),
      "23514",
    );
  });
});

describe("message global", () => {
  it("n'affiche au public que les messages actifs et en cours", async () => {
    const admin = await createAdmin();
    const marker = `msg-${Date.now()}`;
    await asUser(admin.id, (sql) =>
      sql(
        `insert into public.site_announcements (message, kind, starts_at, ends_at, is_active) values
           ($1 || ' en cours', 'maintenance', now() - interval '1 hour', now() + interval '1 hour', true),
           ($1 || ' à venir', 'info', now() + interval '1 day', null, true),
           ($1 || ' terminé', 'info', null, now() - interval '1 minute', true),
           ($1 || ' désactivé', 'info', null, null, false)`,
        [marker],
      ),
    );
    const query =
      "select message from public.site_announcements where message like $1 order by message";
    expect((await asAnon((sql) => sql(query, [`${marker}%`]))).rows).toEqual([
      { message: `${marker} en cours` },
    ]);
    expect((await asUser(admin.id, (sql) => sql(query, [`${marker}%`]))).rows).toHaveLength(4);

    const { rows } = await asUser(admin.id, (sql) =>
      sql(
        "select action from public.admin_activity where entity = 'announcement' and summary like $1",
        [`${marker}%`],
      ),
    );
    expect(rows).toHaveLength(4);
  });

  it("refuse les liens dangereux et les utilisateurs non administrateurs", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    for (const link of ["javascript:alert(1)", "//evil.example", "http://exemple.cm"]) {
      await expectError(
        asUser(admin.id, (sql) =>
          sql("insert into public.site_announcements (message, link_url) values ('Bonjour', $1)", [
            link,
          ]),
        ),
        "23514",
      );
    }
    await asUser(admin.id, (sql) =>
      sql(
        "insert into public.site_announcements (message, link_url) values ('Nouvelles règles', '/aide'), ('Blog', 'https://exemple.cm/blog')",
      ),
    );
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("insert into public.site_announcements (message) values ('Faux message')"),
      ),
    );
    await expectDenied(
      asAnon((sql) => sql("insert into public.site_announcements (message) values ('Faux')")),
    );
    const deleted = await asUser(user.id, (sql) => sql("delete from public.site_announcements"));
    expect(deleted.rowCount).toBe(0);
  });
});
