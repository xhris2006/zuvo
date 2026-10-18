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
} from "./support/db";

async function createAdmin() {
  const admin = await createUser();
  await makeAdmin(admin.id);
  return admin;
}

async function report(reporterId: string, targetType: string, targetId: string) {
  const { rows } = await asUser(reporterId, (sql) =>
    sql<{ id: string }>(
      "insert into public.reports (target_type, target_id, reason) values ($1, $2, 'scam') returning id",
      [targetType, targetId],
    ),
  );
  return rows[0]!.id;
}

async function journal(targetId: string) {
  const { rows } = await asOwner((sql) =>
    sql<{ action: string; admin_id: string; note: string | null }>(
      "select action, admin_id, note from public.moderation_actions where target_id = $1 order by created_at",
      [targetId],
    ),
  );
  return rows;
}

const adminCalls: Array<[string, (ids: { listing: string; user: string }) => unknown[]]> = [
  ["select public.admin_remove_listing($1, $2)", (ids) => [ids.listing, "Contrefaçon"]],
  ["select public.admin_restore_listing($1)", (ids) => [ids.listing]],
  ["select public.admin_set_user_suspension($1, true, $2)", (ids) => [ids.user, "Arnaque"]],
  [
    "select public.admin_update_report($1, 'dismissed')",
    () => ["4f1c2a3b-0000-4000-8000-000000000000"],
  ],
  [
    "select * from public.admin_get_reported_message($1)",
    () => ["4f1c2a3b-0000-4000-8000-000000000000"],
  ],
  ["select public.admin_get_stats()", () => []],
];

describe("fonctions d'administration", () => {
  it("sont refusées aux utilisateurs non administrateurs et aux visiteurs", async () => {
    const seller = await createUser();
    const user = await createUser();
    const ids = { listing: await createActiveListing(seller.id), user: seller.id };
    for (const [query, args] of adminCalls) {
      await expectDenied(asUser(user.id, (sql) => sql(query, args(ids))));
      await expectDenied(asAnon((sql) => sql(query, args(ids))));
    }
    // Rien n'a été modifié.
    const { rows } = await asOwner((sql) =>
      sql("select removed_at from public.listings where id = $1", [ids.listing]),
    );
    expect(rows[0]).toEqual({ removed_at: null });
  });

  it("ne permettent pas de s'attribuer le rôle administrateur", async () => {
    const user = await createUser();
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("insert into public.user_roles (user_id, role) values ($1, 'admin')", [user.id]),
      ),
    );
  });
});

describe("retrait et restauration d'annonce", () => {
  it("retire l'annonce, prévient le vendeur, clôt le signalement et journalise", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    const reporter = await createUser();
    const listingId = await createActiveListing(seller.id);
    const reportId = await report(reporter.id, "listing", listingId);

    await asUser(admin.id, (sql) =>
      sql("select public.admin_remove_listing($1, $2, $3)", [
        listingId,
        "  Article interdit  ",
        reportId,
      ]),
    );

    const { rows } = await asOwner((sql) =>
      sql<{ status: string; removed_reason: string }>(
        "select status, removed_reason from public.listings where id = $1",
        [listingId],
      ),
    );
    expect(rows[0]).toEqual({ status: "withdrawn", removed_reason: "Article interdit" });

    // Masquée au public, visible par son vendeur.
    const query = "select id from public.listings where id = $1";
    expect((await asAnon((sql) => sql(query, [listingId]))).rows).toHaveLength(0);
    expect((await asUser(seller.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(1);

    // Contenu figé pour le vendeur : ni remise en ligne, ni modification.
    const republished = await asUser(seller.id, (sql) =>
      sql("update public.listings set status = 'active', title = 'Autre' where id = $1", [
        listingId,
      ]),
    );
    expect(republished.rowCount).toBe(0);

    const reportRow = await asOwner((sql) =>
      sql<{ status: string; reviewed_by: string }>(
        "select status, reviewed_by from public.reports where id = $1",
        [reportId],
      ),
    );
    expect(reportRow.rows[0]).toEqual({ status: "resolved", reviewed_by: admin.id });

    const notifications = await asOwner((sql) =>
      sql("select type from public.notifications where user_id = $1", [seller.id]),
    );
    expect(notifications.rows).toEqual([{ type: "listing_removed" }]);

    expect(await journal(listingId)).toEqual([
      { action: "listing_removed", admin_id: admin.id, note: "Article interdit" },
    ]);

    await asUser(admin.id, (sql) => sql("select public.admin_restore_listing($1)", [listingId]));
    await asUser(seller.id, (sql) =>
      sql("update public.listings set status = 'active' where id = $1", [listingId]),
    );
    expect((await asAnon((sql) => sql(query, [listingId]))).rows).toHaveLength(1);
    expect((await journal(listingId)).map((row) => row.action)).toEqual([
      "listing_removed",
      "listing_restored",
    ]);
  });

  it("exige un motif et refuse une annonce déjà retirée", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectError(
      asUser(admin.id, (sql) => sql("select public.admin_remove_listing($1, ' ')", [listingId])),
      "22023",
    );
    await asUser(admin.id, (sql) =>
      sql("select public.admin_remove_listing($1, 'Arnaque')", [listingId]),
    );
    await expectError(
      asUser(admin.id, (sql) =>
        sql("select public.admin_remove_listing($1, 'Arnaque')", [listingId]),
      ),
      "P0002",
    );
  });
});

describe("suspension de compte", () => {
  it("suspend puis réactive un utilisateur, avec journal", async () => {
    const admin = await createAdmin();
    const target = await createUser();

    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_user_suspension($1, true, 'Arnaques répétées')", [target.id]),
    );
    const visible = "select id from public.profiles where id = $1";
    expect((await asAnon((sql) => sql(visible, [target.id]))).rows).toHaveLength(0);
    expect((await asUser(admin.id, (sql) => sql(visible, [target.id]))).rows).toHaveLength(1);

    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_user_suspension($1, false)", [target.id]),
    );
    expect((await asAnon((sql) => sql(visible, [target.id]))).rows).toHaveLength(1);
    expect((await journal(target.id)).map((row) => row.action)).toEqual([
      "user_suspended",
      "user_unsuspended",
    ]);
  });

  it("refuse de suspendre son propre compte ou un administrateur", async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();
    for (const id of [admin.id, otherAdmin.id]) {
      await expectDenied(
        asUser(admin.id, (sql) =>
          sql("select public.admin_set_user_suspension($1, true, 'Essai')", [id]),
        ),
      );
    }
  });
});

describe("signalements", () => {
  it("l'administration voit et traite tous les signalements", async () => {
    const admin = await createAdmin();
    const reporter = await createUser();
    const target = await createUser();
    const reportId = await report(reporter.id, "user", target.id);

    const list = await asUser(admin.id, (sql) =>
      sql("select id from public.reports where id = $1", [reportId]),
    );
    expect(list.rows).toHaveLength(1);

    await asUser(admin.id, (sql) =>
      sql("select public.admin_update_report($1, 'in_review')", [reportId]),
    );
    await asUser(admin.id, (sql) =>
      sql("select public.admin_update_report($1, 'dismissed', 'Pas de preuve')", [reportId]),
    );
    // L'auteur voit l'issue, pas les champs internes de la modération.
    const { rows } = await asUser(reporter.id, (sql) =>
      sql<{ status: string }>("select status from public.reports where id = $1", [reportId]),
    );
    expect(rows[0]).toEqual({ status: "dismissed" });
    for (const column of ["resolution_note", "reviewed_by"]) {
      await expectDenied(
        asUser(reporter.id, (sql) =>
          sql(`select ${column} from public.reports where id = $1`, [reportId]),
        ),
      );
    }

    const listed = await asUser(admin.id, (sql) =>
      sql<{ id: string; resolution_note: string; reporter_username: string; total_count: string }>(
        "select id, resolution_note, reporter_username, total_count from public.admin_list_reports('dismissed', 100, 0)",
      ),
    );
    expect(listed.rows.find((row) => row.id === reportId)).toMatchObject({
      resolution_note: "Pas de preuve",
      reporter_username: reporter.username,
    });
    await expectDenied(
      asUser(reporter.id, (sql) => sql("select * from public.admin_list_reports('pending')")),
    );
    expect((await journal(target.id)).map((row) => row.action)).toEqual([
      "report_in_review",
      "report_dismissed",
    ]);
  });

  it("montre uniquement le message signalé et journalise la consultation", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id);
    const { rows: conv } = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
    );
    const { rows: msg } = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>(
        "insert into public.messages (conversation_id, body) values ($1, 'Paie d''abord par Mobile Money') returning id",
        [conv[0]!.id],
      ),
    );
    const reportId = await report(seller.id, "message", msg[0]!.id);

    // L'administrateur ne lit pas les messages directement.
    const direct = await asUser(admin.id, (sql) =>
      sql("select body from public.messages where id = $1", [msg[0]!.id]),
    );
    expect(direct.rows).toHaveLength(0);

    const { rows } = await asUser(admin.id, (sql) =>
      sql<{ body: string; sender_username: string }>(
        "select body, sender_username from public.admin_get_reported_message($1)",
        [reportId],
      ),
    );
    expect(rows).toEqual([
      { body: "Paie d'abord par Mobile Money", sender_username: buyer.username },
    ]);
    expect((await journal(msg[0]!.id)).map((row) => row.action)).toEqual(["message_viewed"]);
  });
});

describe("journal et statistiques", () => {
  it("le journal n'est lisible que par l'administration et n'est pas modifiable", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await asUser(admin.id, (sql) =>
      sql("select public.admin_remove_listing($1, 'Spam')", [listingId]),
    );
    const query = "select id from public.moderation_actions where target_id = $1";
    expect((await asUser(admin.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(1);
    expect((await asUser(user.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(0);
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql(
          "insert into public.moderation_actions (action, target_type, target_id) values ('listing_removed', 'listing', $1)",
          [listingId],
        ),
      ),
    );
    await expectDenied(
      asUser(admin.id, (sql) =>
        sql("delete from public.moderation_actions where target_id = $1", [listingId]),
      ),
    );
  });

  it("renvoie des compteurs réels", async () => {
    const admin = await createAdmin();
    const { rows } = await asUser(admin.id, (sql) =>
      sql<{ stats: Record<string, number> }>("select public.admin_get_stats() as stats"),
    );
    expect(Object.keys(rows[0]!.stats).sort()).toEqual([
      "active_listings",
      "in_review_reports",
      "new_listings_7d",
      "new_users_7d",
      "pending_reports",
      "removed_listings",
      "suspended_users",
      "users",
    ]);

    // Même instruction, donc même instantané : d'autres tests créent des
    // comptes en parallèle.
    const { rows: compared } = await asUser(admin.id, (sql) =>
      sql<{ reported: number; real: number }>(
        `select (private.admin_get_stats() ->> 'users')::int as reported,
                (select count(*) from public.profiles)::int as real`,
      ),
    );
    expect(compared[0]!.reported).toBe(compared[0]!.real);
  });
});
