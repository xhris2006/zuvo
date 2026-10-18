import { describe, expect, it } from "vitest";
import { describeNotification, notificationHref } from "./content";

const LISTING_ID = "4f1c2a3b-0000-4000-8000-0000000000aa";
const CONVERSATION_ID = "4f1c2a3b-0000-4000-8000-0000000000bb";

describe("describeNotification", () => {
  it("décrit chaque type de notification", () => {
    expect(
      describeNotification({
        type: "new_message",
        actorName: "Awa",
        listingTitle: "Robe en wax",
      }),
    ).toEqual({
      title: "Nouveau message",
      body: "Awa vous a écrit à propos de «\u00a0Robe en wax\u00a0».",
    });
    expect(
      describeNotification({ type: "new_follower", actorName: "Awa", listingTitle: null }).body,
    ).toBe("Awa suit désormais votre profil.");
    expect(
      describeNotification({
        type: "listing_removed",
        actorName: null,
        listingTitle: "iPhone 12",
      }).body,
    ).toBe("Votre annonce «\u00a0iPhone 12\u00a0» a été retirée par la modération.");
  });

  it("remplace un auteur ou une annonce indisponible", () => {
    expect(
      describeNotification({ type: "listing_favorited", actorName: null, listingTitle: null }).body,
    ).toBe("Un utilisateur a ajouté «\u00a0une annonce\u00a0» à ses favoris.");
  });

  it("raccourcit les titres trop longs", () => {
    const { body } = describeNotification({
      type: "followed_user_listing",
      actorName: "Awa",
      listingTitle: "a".repeat(80),
    });
    expect(body).toContain(`«\u00a0${"a".repeat(59)}…\u00a0»`);
  });
});

describe("notificationHref", () => {
  const base = { actorUsername: null, listingId: null, conversationId: null };

  it("mène à la conversation, au profil ou à l'annonce", () => {
    expect(
      notificationHref({ ...base, type: "new_message", conversationId: CONVERSATION_ID }),
    ).toBe(`/messages/${CONVERSATION_ID}`);
    expect(notificationHref({ ...base, type: "new_follower", actorUsername: "awa" })).toBe(
      "/u/awa",
    );
    expect(notificationHref({ ...base, type: "listing_favorited", listingId: LISTING_ID })).toBe(
      `/annonces/${LISTING_ID}`,
    );
  });

  it("se replie sur une page générale si la cible a disparu", () => {
    expect(notificationHref({ ...base, type: "new_message" })).toBe("/messages");
    expect(notificationHref({ ...base, type: "listing_removed" })).toBe("/notifications");
  });
});
