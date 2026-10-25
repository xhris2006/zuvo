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
  makeAdmin,
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

async function emailOf(userId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ email: string }>("select email from auth.users where id = $1", [userId]),
  );
  return rows[0]!.email;
}

type Trends = {
  days: { day: string; users: number; listings: number; reports: number }[];
  cities: { city: string; active_listings: number; users: number }[];
  categories: { slug: string; name: string; active_listings: number }[];
};

describe("tendances du tableau de bord", () => {
  it("donnent les chiffres par jour, par ville et par catégorie à l'équipe", async () => {
    const moderator = await createModerator();
    const seller = await createUser();
    await createActiveListing(seller.id, { city: "kribi", title: "Pirogue miniature" });

    const { rows } = await asUser(moderator.id, (sql) =>
      sql<{ trends: Trends }>("select public.admin_get_trends(30) as trends"),
    );
    const trends = rows[0]!.trends;
    expect(trends.days).toHaveLength(30);
    const today = trends.days.at(-1)!;
    expect(today.users).toBeGreaterThanOrEqual(2);
    expect(today.listings).toBeGreaterThanOrEqual(1);
    expect(
      trends.cities.find((city) => city.city === "kribi")?.active_listings,
    ).toBeGreaterThanOrEqual(1);
    expect(trends.categories.find((category) => category.slug === "mode-femme")).toMatchObject({
      name: "Mode femme",
    });

    // Période bornée entre 7 et 90 jours.
    const { rows: short } = await asUser(moderator.id, (sql) =>
      sql<{ trends: Trends }>("select public.admin_get_trends(2) as trends"),
    );
    expect(short[0]!.trends.days).toHaveLength(7);
  });

  it("sont refusées aux utilisateurs et aux visiteurs", async () => {
    const user = await createUser();
    await expectDenied(asUser(user.id, (sql) => sql("select public.admin_get_trends()")));
    await expectDenied(asAnon((sql) => sql("select public.admin_get_trends()")));
  });
});

describe("recherche d'un compte par e-mail ou téléphone", () => {
  it("trouve un compte et journalise la recherche sans le terme recherché", async () => {
    const admin = await createAdmin();
    const target = await createUser();
    const email = await emailOf(target.id);
    await asOwner((sql) =>
      sql("update public.profile_private set phone = '+237690123456' where id = $1", [target.id]),
    );

    const search = (query: string) =>
      asUser(admin.id, (sql) =>
        sql<{ id: string; email: string; phone: string | null }>(
          "select * from public.admin_find_users($1)",
          [query],
        ),
      );
    expect((await search(email.toUpperCase())).rows).toEqual([
      expect.objectContaining({ id: target.id, email, phone: "+237690123456" }),
    ]);
    expect((await search(email.split("@")[0]!)).rows.map((row) => row.id)).toEqual([target.id]);
    expect((await search("6 90 12 34 56")).rows.map((row) => row.id)).toContain(target.id);

    const { rows } = await asOwner((sql) =>
      sql<{ summary: string }>(
        "select summary from public.admin_activity where admin_id = $1 and entity = 'user_search' order by created_at",
        [admin.id],
      ),
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]!.summary).toBe("Recherche par e-mail ou téléphone : 1 résultat");
    expect(rows.map((row) => row.summary).join(" ")).not.toContain(email);
  });

  it("est réservée aux administrateurs et exige au moins 3 caractères", async () => {
    const admin = await createAdmin();
    const moderator = await createModerator();
    const user = await createUser();
    await expectError(
      asUser(admin.id, (sql) => sql("select * from public.admin_find_users('ab')")),
      "22023",
    );
    for (const actor of [moderator, user]) {
      await expectDenied(
        asUser(actor.id, (sql) => sql("select * from public.admin_find_users('example')")),
      );
    }
    await expectDenied(asAnon((sql) => sql("select * from public.admin_find_users('example')")));
  });
});

describe("anti-spam", () => {
  it("refuse une annonce contenant un mot interdit (mot entier, sans accents)", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    const word = `contrefacon${Date.now().toString(36)}`;
    await asUser(admin.id, (sql) =>
      sql("insert into public.banned_words (word) values ($1)", [word]),
    );

    await expectError(
      createDraft(seller.id, { title: `Sac ${word.toUpperCase()} cuir` }),
      "P0001",
      /listing_banned_word/,
    );
    const draft = await createDraft(seller.id, { title: "Sac en cuir marron" });
    await expectError(
      asUser(seller.id, (sql) =>
        sql("update public.listings set description = $1 where id = $2", [
          `Très bon état, ${word} garanti.`,
          draft,
        ]),
      ),
      "P0001",
      /listing_banned_word/,
    );
    // Un mot plus long qui contient le terme n'est pas concerné.
    await createDraft(seller.id, { title: `Sac ${word}s rare` });

    const { rows } = await asOwner((sql) =>
      sql(
        "select action from public.admin_activity where entity = 'banned_word' and summary = $1",
        [word],
      ),
    );
    expect(rows).toEqual([{ action: "created" }]);
  });

  it("réserve la liste et les réglages aux administrateurs", async () => {
    const admin = await createAdmin();
    const moderator = await createModerator();
    const user = await createUser();
    for (const actor of [moderator, user]) {
      await expectDenied(
        asUser(actor.id, (sql) => sql("insert into public.banned_words (word) values ('arnaque')")),
      );
      expect(
        (await asUser(actor.id, (sql) => sql("select key from public.app_settings"))).rows,
      ).toEqual([]);
      const updated = await asUser(actor.id, (sql) =>
        sql("update public.app_settings set value = 99 where key = 'new_account_daily_listings'"),
      );
      expect(updated.rowCount).toBe(0);
    }
    const { rows } = await asUser(admin.id, (sql) =>
      sql<{ key: string; value: number }>(
        "select key, value from public.app_settings order by key",
      ),
    );
    expect(rows.map((row) => row.key)).toEqual(["new_account_daily_listings", "new_account_days"]);
    await expectError(
      asUser(admin.id, (sql) =>
        sql("update public.app_settings set value = 1000 where key = 'new_account_days'"),
      ),
      "23514",
    );
    await expectError(
      asUser(admin.id, (sql) => sql("insert into public.banned_words (word) values ('Arnaqué')")),
      "23514",
    );
  });

  it("limite les publications quotidiennes d'un compte récent", async () => {
    const seller = await createUser();
    for (let index = 0; index < 5; index += 1) {
      await createActiveListing(seller.id, { title: `Article numéro ${index + 1}` });
    }
    await expectError(
      createActiveListing(seller.id, { title: "Sixième article" }),
      "P0001",
      /new_account_publication_limit/,
    );

    // Un compte plus ancien n'est pas limité.
    await asOwner((sql) =>
      sql("update public.profiles set created_at = now() - interval '30 days' where id = $1", [
        seller.id,
      ]),
    );
    await createActiveListing(seller.id, { title: "Sixième article" });
  });

  it("signale les doublons probables à l'équipe", async () => {
    const moderator = await createModerator();
    const seller = await createUser();
    const other = await createUser();
    const title = `iPhone ${Date.now().toString(36)} 128 Go`;
    const first = await createActiveListing(seller.id, { title });
    const second = await createActiveListing(seller.id, { title: `  ${title.toUpperCase()} ` });
    // Même titre chez un autre vendeur avec une autre description : pas un doublon.
    await createActiveListing(other.id, {
      title: `Unique ${title}`,
      description: "Description différente du premier vendeur.",
    });

    const { rows } = await asUser(moderator.id, (sql) =>
      sql<{ listing_ids: string[]; listing_count: number; seller_count: number }>(
        "select * from public.admin_find_duplicate_listings(200) where $1 = any (listing_ids)",
        [first],
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.listing_ids.sort()).toEqual([first, second].sort());
    expect(rows[0]).toMatchObject({ listing_count: 2, seller_count: 1 });

    const user = await createUser();
    await expectDenied(
      asUser(user.id, (sql) => sql("select * from public.admin_find_duplicate_listings()")),
    );
  });
});
