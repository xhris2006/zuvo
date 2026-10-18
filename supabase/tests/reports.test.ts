import { describe, expect, it } from "vitest";
import {
  asAnon,
  asUser,
  createActiveListing,
  createDraft,
  createUser,
  expectDenied,
  expectError,
  makeAdmin,
} from "./support/db";

const report = (userId: string, targetType: string, targetId: string, reason = "scam") =>
  asUser(userId, (sql) =>
    sql<{ id: string; status: string }>(
      "insert into public.reports (target_type, target_id, reason) values ($1, $2, $3) returning id, status",
      [targetType, targetId, reason],
    ),
  );

describe("signalements", () => {
  it("permettent de signaler une annonce, un utilisateur ou un message reçu", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id);
    const conversation = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
    );
    const message = await asUser(seller.id, (sql) =>
      sql<{ id: string }>(
        "insert into public.messages (conversation_id, body) values ($1, 'Payez d''abord') returning id",
        [conversation.rows[0]!.id],
      ),
    );
    expect((await report(buyer.id, "listing", listingId)).rows[0]!.status).toBe("pending");
    expect((await report(buyer.id, "user", seller.id, "fake_account")).rowCount).toBe(1);
    expect((await report(buyer.id, "message", message.rows[0]!.id)).rowCount).toBe(1);
  });

  it("refusent les cibles inaccessibles ou invalides", async () => {
    const seller = await createUser();
    const reporter = await createUser();
    const draftId = await createDraft(seller.id);
    const ownListing = await createActiveListing(reporter.id);
    await expectError(report(reporter.id, "listing", draftId), "P0002");
    await expectError(report(reporter.id, "listing", ownListing), "P0002");
    await expectError(report(reporter.id, "user", reporter.id), "P0002");
  });

  it("refusent le signalement d'un message d'une conversation dont on ne fait pas partie", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const outsider = await createUser();
    const listingId = await createActiveListing(seller.id);
    const conversation = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_conversation($1) as id", [listingId]),
    );
    const message = await asUser(buyer.id, (sql) =>
      sql<{ id: string }>(
        "insert into public.messages (conversation_id, body) values ($1, 'Bonjour') returning id",
        [conversation.rows[0]!.id],
      ),
    );
    await expectError(report(outsider.id, "message", message.rows[0]!.id), "P0002");
  });

  it("empêchent les doublons tant que le signalement est ouvert", async () => {
    const seller = await createUser();
    const reporter = await createUser();
    const listingId = await createActiveListing(seller.id);
    await report(reporter.id, "listing", listingId);
    await expectError(report(reporter.id, "listing", listingId), "23505");
  });

  it("n'autorisent pas l'utilisateur à fixer le statut ou le traitement", async () => {
    const seller = await createUser();
    const reporter = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectDenied(
      asUser(reporter.id, (sql) =>
        sql(
          "insert into public.reports (target_type, target_id, reason, status) values ('listing', $1, 'scam', 'resolved')",
          [listingId],
        ),
      ),
    );
    const { rows } = await report(reporter.id, "listing", listingId);
    await expectDenied(
      asUser(reporter.id, (sql) =>
        sql("update public.reports set status = 'dismissed' where id = $1", [rows[0]!.id]),
      ),
    );
  });

  it("sont visibles par leur auteur et par l'administration uniquement", async () => {
    const seller = await createUser();
    const reporter = await createUser();
    const admin = await createUser();
    await makeAdmin(admin.id);
    const listingId = await createActiveListing(seller.id);
    const { rows } = await report(reporter.id, "listing", listingId);
    const query = "select id from public.reports where id = $1";
    expect((await asUser(reporter.id, (sql) => sql(query, [rows[0]!.id]))).rows).toHaveLength(1);
    expect((await asUser(admin.id, (sql) => sql(query, [rows[0]!.id]))).rows).toHaveLength(1);
    expect((await asUser(seller.id, (sql) => sql(query, [rows[0]!.id]))).rows).toHaveLength(0);
    await expectDenied(asAnon((sql) => sql(query, [rows[0]!.id])));
  });

  it("sont réservés aux utilisateurs connectés", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectDenied(
      asAnon((sql) =>
        sql(
          "insert into public.reports (target_type, target_id, reason) values ('listing', $1, 'scam')",
          [listingId],
        ),
      ),
    );
  });
});
