import { beforeEach, describe, expect, it } from "vitest";
import { answerSupportRequestAction } from "@/features/admin/actions";
import { setSellerVerificationAction } from "@/features/admin/management-actions";
import { getSupportRequests } from "@/features/admin/management-queries";
import { getFeedListings } from "@/features/listings/feed";
import { getNotifications } from "@/features/notifications/queries";
import { getProfileByUsername } from "@/features/profiles/queries";
import { searchShops } from "@/features/profiles/shops";
import { getSearchSuggestions } from "@/features/search/suggestions";
import { createSupportRequestAction, sendSupportMessageAction } from "@/features/support/actions";
import {
  getAppealableListing,
  getMySupportRequests,
  getSupportThread,
} from "@/features/support/queries";
import { asOwner, createActiveListing, createUser, makeAdmin } from "../support/db";
import { actAs } from "./support/context";
import { RedirectError } from "./support/setup";

const idle = { status: "idle" as const };

/** URL de redirection d'une action (la création d'une demande ouvre sa conversation). */
async function redirectOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (!(error instanceof RedirectError)) throw error ?? new Error("redirection attendue");
  return error.url;
}

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
      await redirectOf(
        createSupportRequestAction(
          idle,
          form({
            kind: "appeal",
            listingId,
            subject: "Contestation du retrait",
            message: "Le sac est authentique, j'ai la facture du magasin.",
          }),
        ),
      ),
    ).toMatch(/^\/assistance\/[0-9a-f-]{36}$/);
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
      lastMessage: { body: "Annonce rétablie après vérification.", fromStaff: true },
    });
    const notifications = await getNotifications();
    expect(notifications.items[0]).toMatchObject({
      type: "support_reply",
      title: "Réponse de l'assistance",
    });
    expect(notifications.items[0]!.body).toContain("Contestation du retrait");
  });

  it("conversation d'assistance entre un membre et l'équipe, privée", async () => {
    const member = await createUser();
    const moderator = await createModerator();
    const other = await createUser();

    actAs(member);
    const url = await redirectOf(
      createSupportRequestAction(
        idle,
        form({
          kind: "contact",
          listingId: "",
          subject: "Paiement bloqué",
          message: "Bonjour, mon acheteur dit avoir payé mais je n'ai rien reçu.",
        }),
      ),
    );
    const requestId = url.split("/").at(-1)!;
    expect(
      await sendSupportMessageAction(idle, form({ requestId, body: "Référence : 12345." })),
    ).toEqual({ status: "success" });
    expect(await sendSupportMessageAction(idle, form({ requestId, body: "   " }))).toMatchObject({
      status: "error",
      fieldErrors: { body: "Écrivez un message." },
    });

    actAs(moderator);
    const notifications = await getNotifications();
    expect(notifications.items.filter((item) => item.supportRequestId === requestId)).toMatchObject(
      [{ type: "support_message", title: "Message à l'assistance" }],
    );
    expect(
      await answerSupportRequestAction(idle, form({ requestId, response: "Nous vérifions." })),
    ).toMatchObject({ status: "success" });

    actAs(member);
    const thread = await getSupportThread(requestId);
    expect(thread?.messages.map((message) => [message.body, message.fromStaff])).toEqual([
      ["Bonjour, mon acheteur dit avoir payé mais je n'ai rien reçu.", false],
      ["Référence : 12345.", false],
      ["Nous vérifions.", true],
    ]);
    expect(thread?.status).toBe("answered");

    actAs(other);
    expect(await getSupportThread(requestId)).toBeNull();
    expect(
      await sendSupportMessageAction(idle, form({ requestId, body: "Intrusion" })),
    ).toMatchObject({ status: "error", message: "Demande introuvable." });
  });

  it("les suggestions de recherche trouvent aussi un membre sans annonce", async () => {
    const name = `Zebulon${Date.now().toString(36)}`;
    const member = await createUser({ display_name: `${name} Atangana` });
    actAs(null);
    const suggestions = await getSearchSuggestions(name.toLowerCase());
    expect(suggestions.members).toEqual([
      expect.objectContaining({ username: member.username, displayName: `${name} Atangana` }),
    ]);
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
