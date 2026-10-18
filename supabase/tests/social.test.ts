import { describe, expect, it } from "vitest";
import {
  asAnon,
  asUser,
  createActiveListing,
  createDraft,
  createUser,
  expectDenied,
  expectError,
  suspendUser,
} from "./support/db";

const follow = (followerId: string, followingId: string) =>
  asUser(followerId, (sql) =>
    sql("insert into public.follows (following_id) values ($1)", [followingId]),
  );

const block = (blockerId: string, blockedId: string) =>
  asUser(blockerId, (sql) =>
    sql("insert into public.blocks (blocked_id) values ($1)", [blockedId]),
  );

describe("abonnements", () => {
  it("permet de suivre puis de ne plus suivre un vendeur", async () => {
    const fan = await createUser();
    const seller = await createUser();
    await follow(fan.id, seller.id);
    const removed = await asUser(fan.id, (sql) =>
      sql("delete from public.follows where following_id = $1", [seller.id]),
    );
    expect(removed.rowCount).toBe(1);
  });

  it("rend les listes d'abonnés publiques et empêche les doublons", async () => {
    const fan = await createUser();
    const seller = await createUser();
    await follow(fan.id, seller.id);
    const { rows } = await asAnon((sql) =>
      sql("select count(*)::int as total from public.follows where following_id = $1", [seller.id]),
    );
    expect(rows[0]).toEqual({ total: 1 });
    await expectError(follow(fan.id, seller.id), "23505");
  });

  it("interdit de se suivre soi-même ou de faire suivre quelqu'un d'autre", async () => {
    const user = await createUser();
    const victim = await createUser();
    const target = await createUser();
    await expectError(follow(user.id, user.id), "23514");
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [
          victim.id,
          target.id,
        ]),
      ),
    );
  });

  it("empêche de supprimer l'abonnement d'un autre utilisateur", async () => {
    const fan = await createUser();
    const seller = await createUser();
    const attacker = await createUser();
    await follow(fan.id, seller.id);
    const { rowCount } = await asUser(attacker.id, (sql) =>
      sql("delete from public.follows where follower_id = $1", [fan.id]),
    );
    expect(rowCount).toBe(0);
  });

  it("refuse de suivre un compte suspendu ou depuis un compte suspendu", async () => {
    const fan = await createUser();
    const suspended = await createUser();
    await suspendUser(suspended.id);
    await expectDenied(follow(fan.id, suspended.id));
    await expectDenied(follow(suspended.id, fan.id));
  });
});

describe("favoris", () => {
  it("sont privés", async () => {
    const buyer = await createUser();
    const other = await createUser();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await asUser(buyer.id, (sql) =>
      sql("insert into public.favorites (listing_id) values ($1)", [listingId]),
    );
    const query = "select listing_id from public.favorites where listing_id = $1";
    expect((await asUser(buyer.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(1);
    expect((await asUser(other.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(0);
    expect((await asUser(seller.id, (sql) => sql(query, [listingId]))).rows).toHaveLength(0);
    await expectDenied(asAnon((sql) => sql(query, [listingId])));
  });

  it("refusent les doublons et les brouillons", async () => {
    const buyer = await createUser();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    const draftId = await createDraft(seller.id);
    const add = (id: string) =>
      asUser(buyer.id, (sql) => sql("insert into public.favorites (listing_id) values ($1)", [id]));
    await add(listingId);
    await expectError(add(listingId), "23505");
    await expectDenied(add(draftId));
  });

  it("ne peuvent pas être ajoutés au nom d'un autre utilisateur", async () => {
    const buyer = await createUser();
    const attacker = await createUser();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    await expectDenied(
      asUser(attacker.id, (sql) =>
        sql("insert into public.favorites (user_id, listing_id) values ($1, $2)", [
          buyer.id,
          listingId,
        ]),
      ),
    );
  });
});

describe("blocages", () => {
  it("sont visibles uniquement par la personne qui bloque", async () => {
    const blocker = await createUser();
    const blocked = await createUser();
    await block(blocker.id, blocked.id);
    const query = "select blocked_id from public.blocks where blocker_id = $1";
    expect((await asUser(blocker.id, (sql) => sql(query, [blocker.id]))).rows).toHaveLength(1);
    expect((await asUser(blocked.id, (sql) => sql(query, [blocker.id]))).rows).toHaveLength(0);
  });

  it("suppriment les abonnements réciproques et empêchent de se suivre", async () => {
    const a = await createUser();
    const b = await createUser();
    await follow(a.id, b.id);
    await follow(b.id, a.id);
    await block(a.id, b.id);
    const { rows } = await asAnon((sql) =>
      sql(
        "select count(*)::int as total from public.follows where follower_id in ($1, $2) and following_id in ($1, $2)",
        [a.id, b.id],
      ),
    );
    expect(rows[0]).toEqual({ total: 0 });
    await expectDenied(follow(b.id, a.id));
    await expectDenied(follow(a.id, b.id));
  });

  it("interdisent l'auto-blocage et le blocage au nom d'un autre", async () => {
    const user = await createUser();
    const victim = await createUser();
    await expectError(block(user.id, user.id), "23514");
    await expectDenied(
      asUser(user.id, (sql) =>
        sql("insert into public.blocks (blocker_id, blocked_id) values ($1, $2)", [
          victim.id,
          user.id,
        ]),
      ),
    );
  });

  it("se lèvent par la personne qui a bloqué uniquement", async () => {
    const blocker = await createUser();
    const blocked = await createUser();
    await block(blocker.id, blocked.id);
    const byBlocked = await asUser(blocked.id, (sql) =>
      sql("delete from public.blocks where blocker_id = $1", [blocker.id]),
    );
    expect(byBlocked.rowCount).toBe(0);
    const byBlocker = await asUser(blocker.id, (sql) =>
      sql("delete from public.blocks where blocked_id = $1", [blocked.id]),
    );
    expect(byBlocker.rowCount).toBe(1);
  });
});
