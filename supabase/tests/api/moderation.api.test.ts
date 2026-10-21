import { beforeEach, describe, expect, it } from "vitest";
import {
  removeListingAction,
  restoreListingAction,
  setUserSuspensionAction,
  updateReportStatusAction,
  viewReportedMessageAction,
} from "@/features/admin/actions";
import {
  getAdminReports,
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
import { createActiveListing, createUser, makeAdmin } from "../support/db";
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
});
