import { beforeEach, describe, expect, it } from "vitest";
import { answerSupportRequestAction } from "@/features/admin/actions";
import { setSellerVerificationAction } from "@/features/admin/management-actions";
import { getSupportRequests } from "@/features/admin/management-queries";
import { getFeedListings } from "@/features/listings/feed";
import { getNotifications } from "@/features/notifications/queries";
import { getProfileByUsername } from "@/features/profiles/queries";
import { searchShops } from "@/features/profiles/shops";
import { createSupportRequestAction } from "@/features/support/actions";
import { getAppealableListing, getMySupportRequests } from "@/features/support/queries";
import { asOwner, createActiveListing, createUser, makeAdmin } from "../support/db";
import { actAs } from "./support/context";

const idle = { status: "idle" as const };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createModerator() {
  const moderator = await createUser();
  await asOwner((sql) =>
    sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [moderator.id]),
  );
  return moderator;
}

beforeEach(() => actAs(null));

describe("assistance et badge vérifié (actions et requêtes réelles)", () => {
  it("contestation d'un retrait, réponse de l'équipe et notification", async () => {
    const seller = await createUser();
    const moderator = await createModerator();
    const listingId = await createActiveListing(seller.id, { title: "Sac authentique" });
    await asOwner((sql) =>
      sql(
        "update public.listings set removed_at = now(), removed_reason = 'Contrefaçon', status = 'withdrawn' where id = $1",
        [listingId],
      ),
    );

    actAs(seller);
    expect(await getAppealableListing(seller.id, listingId)).toMatchObject({
      title: "Sac authentique",
      removed_reason: "Contrefaçon",
    });
    expect(
      await createSupportRequestAction(
        idle,
        form({
          kind: "appeal",
          listingId,
          subject: "Contestation du retrait",
          message: "Le sac est authentique, j'ai la facture du magasin.",
        }),
      ),
    ).toMatchObject({ status: "success" });
    expect(
      await createSupportRequestAction(
        idle,
        form({
          kind: "appeal",
          listingId,
          subject: "Encore",
          message: "Deuxième contestation pour la même annonce.",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        status: "error",
        message: "Une contestation est déjà en cours pour cette annonce.",
      }),
    );

    actAs(moderator);
    const inbox = await getSupportRequests("open", 1);
    const request = inbox.items.find((item) => item.listing?.id === listingId);
    expect(request).toMatchObject({
      kind: "appeal",
      author: { id: seller.id, username: seller.username },
      listing: { title: "Sac authentique", removedReason: "Contrefaçon" },
    });
    expect(
      await answerSupportRequestAction(
        idle,
        form({ requestId: request!.id, response: "Annonce rétablie après vérification." }),
      ),
    ).toEqual({ status: "success", message: "Réponse envoyée. L'utilisateur a été prévenu." });

    actAs(seller);
    const [mine] = await getMySupportRequests(seller.id);
    expect(mine).toMatchObject({
      status: "answered",
      response: "Annonce rétablie après vérification.",
    });
    const notifications = await getNotifications();
    expect(notifications.items[0]).toMatchObject({
      type: "support_reply",
      title: "Réponse de l'assistance",
    });
    expect(notifications.items[0]!.body).toContain("Contestation du retrait");
  });

  it("attribue le badge vérifié, visible sur le profil, le fil et les boutiques", async () => {
    const admin = await createUser();
    await makeAdmin(admin.id);
    const moderator = await createModerator();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id, { title: "Lampe vérifiée" });

    actAs(moderator);
    expect(
      await setSellerVerificationAction(
        idle,
        form({ userId: seller.id, verified: "true", note: "" }),
      ),
    ).toEqual({ status: "error", message: "Action réservée à l'administration." });

    actAs(admin);
    expect(
      await setSellerVerificationAction(
        idle,
        form({ userId: seller.id, verified: "true", note: "Pièce d'identité vérifiée" }),
      ),
    ).toEqual({ status: "success", message: "Badge « vendeur vérifié » attribué." });

    actAs(null);
    expect((await getProfileByUsername(seller.username))?.verified_at).toEqual(expect.any(String));
    const feed = await getFeedListings({ pageSize: 100 });
    expect(feed.items.find((item) => item.id === listingId)?.seller?.verified).toBe(true);
    const shops = await searchShops({ q: seller.username });
    expect(shops.items[0]).toMatchObject({ id: seller.id, verified: true });
  });
});
