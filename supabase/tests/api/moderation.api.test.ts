import { beforeEach, describe, expect, it } from "vitest";
import {
  removeListingAction,
  removeUserListingsAction,
  resetProfileAction,
  restoreListingAction,
  setUserSuspensionAction,
  warnUserAction,
  updateReportStatusAction,
  viewReportedMessageAction,
} from "@/features/admin/actions";
import {
  getAdminReports,
  getAdminUserDetail,
  getAdminStats,
  getModerationLog,
  isCurrentUserAdmin,
  searchUsersForAdmin,
} from "@/features/admin/queries";
import { getListingDetail } from "@/features/listings/queries";
import { sendMessageAction, startConversationAction } from "@/features/messaging/actions";
import { createReportAction, toggleBlockAction } from "@/features/moderation/actions";
import { getBlockedUsers, hasBlocked } from "@/features/moderation/queries";
import sitemap from "@/app/sitemap";
import { getNotifications } from "@/features/notifications/queries";
import { asOwner, asUser, createActiveListing, createUser, makeAdmin } from "../support/db";
import { actAs } from "./support/context";
import { RedirectError } from "./support/setup";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => actAs(null));

describe("signalements, blocage et administration (actions réelles)", () => {
  it("parcours complet de modération", async () => {
    const admin = await createUser();
    await makeAdmin(admin.id);
    const seller = await createUser();
    const buyer = await createUser();
    const listingId = await createActiveListing(seller.id, { title: "Faux sac de marque" });

    // L'acheteur écrit, le vendeur signale le message, l'acheteur signale l'annonce.
    actAs(buyer);
    const conversationUrl = await startConversationAction({}, form({ listingId })).catch(
      (error: unknown) => (error instanceof RedirectError ? error.url : ""),
    );
    const conversationId = String(conversationUrl).split("/").pop()!;
    const sent = await sendMessageAction(conversationId, "Paie d'abord par Mobile Money");
    if (sent.status !== "sent") throw new Error(sent.message);
    const listingReport = await createReportAction(
      { status: "idle" },
      form({ targetType: "listing", targetId: listingId, reason: "counterfeit", details: "" }),
    );
    expect(listingReport.status).toBe("success");

    actAs(seller);
    const messageReport = await createReportAction(
      { status: "idle" },
      form({ targetType: "message", targetId: sent.message.id, reason: "scam", details: "" }),
    );
    expect(messageReport.status).toBe("success");
    expect(await toggleBlockAction({ blocked: false }, form({ userId: buyer.id }))).toEqual({
      blocked: true,
    });
    expect(await hasBlocked(seller.id, buyer.id)).toBe(true);
    expect((await getBlockedUsers(seller.id)).map((user) => user.id)).toEqual([buyer.id]);

    // Un utilisateur ordinaire n'est pas administrateur.
    expect(await isCurrentUserAdmin()).toBe(false);
    expect(
      (
        await removeListingAction(
          { status: "idle" },
          form({ listingId, reason: "Test", reportId: "" }),
        )
      ).message,
    ).toBe("Action réservée à l'administration.");

    actAs(admin);
    expect(await isCurrentUserAdmin()).toBe(true);
    const stats = await getAdminStats();
    expect(stats.pending_reports).toBeGreaterThanOrEqual(2);

    const pending = await getAdminReports("pending", 1);
    const listingItem = pending.items.find((item) => item.targetId === listingId);
    const messageItem = pending.items.find((item) => item.targetId === sent.message.id);
    expect(listingItem).toMatchObject({
      reason: "counterfeit",
      reporter: { username: buyer.username },
      target: {
        kind: "listing",
        title: "Faux sac de marque",
        seller: { username: seller.username },
      },
    });
    expect(messageItem?.target).toEqual({ kind: "message", id: sent.message.id });

    expect(await viewReportedMessageAction(messageItem!.id)).toMatchObject({
      status: "ok",
      message: { body: "Paie d'abord par Mobile Money", senderUsername: buyer.username },
    });

    const removed = await removeListingAction(
      { status: "idle" },
      form({ listingId, reason: "Contrefaçon avérée", reportId: listingItem!.id }),
    );
    expect(removed.status).toBe("success");
    actAs(null);
    expect(await getListingDetail(listingId)).toBeNull();

    actAs(admin);
    await restoreListingAction(form({ listingId }));
    expect(
      (
        await updateReportStatusAction(
          { status: "idle" },
          form({ reportId: messageItem!.id, status: "dismissed", note: "Doublon" }),
        )
      ).status,
    ).toBe("success");
    const suspended = await setUserSuspensionAction(
      { status: "idle" },
      form({ userId: buyer.id, suspended: "true", reason: "Arnaque", reportId: "" }),
    );
    expect(suspended.status).toBe("success");

    const found = await searchUsersForAdmin(buyer.username, 1);
    expect(found.items[0]).toMatchObject({ id: buyer.id, suspendedAt: expect.any(String) });
    const log = await getModerationLog(1);
    expect(log.items.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "listing_removed",
        "listing_restored",
        "message_viewed",
        "report_dismissed",
        "user_suspended",
      ]),
    );
  });
});

describe("sitemap (client anonyme)", () => {
  it("liste les annonces en vente et leurs vendeurs", async () => {
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`/annonces/${listingId}`),
        expect.stringContaining(`/u/${seller.username}`),
      ]),
    );
  });

  it("outils sur un compte : fiche, avertissement, profil, retrait des annonces", async () => {
    const admin = await createUser();
    await makeAdmin(admin.id);
    const user = await createUser({ display_name: "Pseudo choquant" });
    await asUser(user.id, (sql) =>
      sql("update public.profiles set bio = 'Texte inapproprié' where id = $1", [user.id]),
    );
    await createActiveListing(user.id, { title: "Annonce douteuse" });
    await createActiveListing(user.id, { title: "Autre annonce" });

    // Un utilisateur ordinaire ne peut rien faire.
    actAs(user);
    expect(
      await warnUserAction({ status: "idle" }, form({ userId: user.id, reason: "Test" })),
    ).toMatchObject({ status: "error" });

    actAs(admin);
    const detail = await getAdminUserDetail(user.id);
    expect(detail).toMatchObject({
      profile: { username: user.username, bio: "Texte inapproprié" },
      isAdmin: false,
      overview: { listings_active: 2, warnings: 0 },
    });
    expect(detail!.listings.map((listing) => listing.title).sort()).toEqual([
      "Annonce douteuse",
      "Autre annonce",
    ]);
    expect(await getAdminUserDetail("pas-un-uuid")).toBeNull();

    expect(
      await warnUserAction(
        { status: "idle" },
        form({ userId: user.id, reason: "Merci de rester courtois." }),
      ),
    ).toMatchObject({ status: "success" });
    expect(
      await resetProfileAction(
        { status: "idle" },
        form({ userId: user.id, reason: "Contenu inapproprié", bio: "on", displayName: "on" }),
      ),
    ).toMatchObject({ status: "success" });
    expect(
      await resetProfileAction({ status: "idle" }, form({ userId: user.id, reason: "Motif" })),
    ).toMatchObject({ status: "error", message: expect.stringMatching(/au moins un élément/) });
    expect(
      await removeUserListingsAction({ status: "idle" }, form({ userId: user.id, reason: "Spam" })),
    ).toMatchObject({ status: "success", message: expect.stringMatching(/^2 annonces retirées/) });

    const after = await getAdminUserDetail(user.id);
    expect(after).toMatchObject({
      profile: { bio: null, displayName: user.username },
      overview: { listings_active: 0, listings_removed: 2, warnings: 1 },
    });
    expect(after!.history.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(["user_warned", "profile_reset", "user_listings_removed"]),
    );

    // L'utilisateur voit l'avertissement dans ses notifications.
    actAs(user);
    const notifications = await getNotifications();
    expect(notifications.items[0]?.type).toBeDefined();
    expect(notifications.items.find((item) => item.type === "moderation_warning")).toMatchObject({
      title: "Avertissement de la modération",
      body: "Merci de rester courtois.",
    });

    // Aucune action possible sur un autre administrateur.
    const otherAdmin = await createUser();
    await makeAdmin(otherAdmin.id);
    actAs(admin);
    expect(
      await warnUserAction({ status: "idle" }, form({ userId: otherAdmin.id, reason: "Test" })),
    ).toMatchObject({ status: "error" });
    const warnings = await asOwner((sql) =>
      sql("select count(*)::int as count from public.notifications where user_id = $1", [
        otherAdmin.id,
      ]),
    );
    expect(warnings.rows[0]).toEqual({ count: 0 });
  });
});
