import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { describeNotification as describe_, notificationHref } from "./content";

const fr = getDictionary("fr");
const describeNotification = (subject: Parameters<typeof describe_>[0]) => describe_(subject, fr);

it("traduit aussi en anglais", () => {
  expect(
    describe_({ type: "new_follower", actorName: "Awa", listingTitle: null }, getDictionary("en"))
      .body,
  ).toBe("Awa is now following you.");
});

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

  it("reprend le texte d'un message de l'équipe", () => {
    expect(
      describeNotification({
        type: "admin_message",
        actorName: null,
        listingTitle: null,
        note: "Maintenance ce soir de 22 h à 23 h.",
      }),
    ).toEqual({ title: "Message de l'équipe", body: "Maintenance ce soir de 22 h à 23 h." });
    expect(
      describe_(
        { type: "admin_message", actorName: null, listingTitle: null, note: "Hello" },
        getDictionary("en"),
      ).title,
    ).toBe("Message from the team");
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

  it("mène au guide d'installation de l'application", () => {
    expect(notificationHref({ ...base, type: "install_guide" })).toBe("/installer");
    expect(
      describeNotification({ type: "install_guide", actorName: null, listingTitle: null }).title,
    ).toBe("Installez l'application MboaDeal");
  });

  it("se replie sur une page générale si la cible a disparu", () => {
    expect(notificationHref({ ...base, type: "new_message" })).toBe("/messages");
    expect(notificationHref({ ...base, type: "listing_removed" })).toBe("/notifications");
  });
});

describe("alertes et assistance", () => {
  const base = { actorUsername: null, listingId: null, conversationId: null };
  const REQUEST_ID = "4f1c2a3b-0000-4000-8000-0000000000cc";
  const USER_ID = "4f1c2a3b-0000-4000-8000-0000000000dd";

  it("décrit un signalement avec son motif traduit", () => {
    expect(
      describeNotification({
        type: "staff_report",
        actorName: "Awa",
        listingTitle: "iPhone 12",
        note: "counterfeit",
      }),
    ).toEqual({
      title: "Alerte de modération",
      body: "Awa a signalé « iPhone 12 » : contrefaçon.",
    });
    expect(
      describeNotification({
        type: "staff_report",
        actorName: "Awa",
        listingTitle: null,
        note: "x",
      }).body,
    ).toBe("Awa a fait un signalement : autre motif.");
  });

  it("décrit une publication bloquée par l'anti-spam", () => {
    expect(
      describeNotification({
        type: "staff_report",
        actorName: "Kevin",
        listingTitle: null,
        note: "spam_banned_word",
      }).body,
    ).toBe("Publication de Kevin bloquée par l'anti-spam : terme interdit.");
    expect(
      notificationHref({
        ...base,
        type: "staff_report",
        note: "spam_banned_word",
        actorId: USER_ID,
      }),
    ).toBe(`/admin/utilisateurs/${USER_ID}`);
    expect(notificationHref({ ...base, type: "staff_report", note: "spam" })).toBe(
      "/admin/signalements",
    );
  });

  it("mène chaque partie à la conversation d'assistance", () => {
    expect(
      describeNotification({
        type: "support_message",
        actorName: "Awa",
        listingTitle: null,
        note: "Compte bloqué",
      }).body,
    ).toBe("Awa a écrit à l'assistance : « Compte bloqué ».");
    expect(
      notificationHref({ ...base, type: "support_message", supportRequestId: REQUEST_ID }),
    ).toBe(`/admin/assistance/${REQUEST_ID}`);
    expect(notificationHref({ ...base, type: "support_reply", supportRequestId: REQUEST_ID })).toBe(
      `/assistance/${REQUEST_ID}`,
    );
    expect(notificationHref({ ...base, type: "support_reply" })).toBe("/assistance");
  });
});
