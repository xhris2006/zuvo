import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { removeListingAction } from "@/features/admin/actions";
import {
  createCategoryAction,
  createCityAction,
  deleteUserAction,
  moveCategoryAction,
  saveAnnouncementAction,
  setRoleAction,
  toggleAnnouncementAction,
  toggleCategoryAction,
} from "@/features/admin/management-actions";
import {
  getAdminCategories,
  getAdminCities,
  getAdminListings,
  getConfigActivity,
  getStaffMembers,
  parseAdminListingFilters,
} from "@/features/admin/management-queries";
import { getCurrentStaffRole, searchUsersForAdmin } from "@/features/admin/queries";
import { getCurrentAnnouncement } from "@/features/announcements/queries";
import { getCities, isAvailableCity } from "@/features/locations/queries";
import { createActiveListing, createUser, makeAdmin } from "../support/db";
import { actAs } from "./support/context";

const idle = { status: "idle" as const };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createAdmin() {
  const admin = await createUser();
  await makeAdmin(admin.id);
  return admin;
}

beforeEach(() => actAs(null));

describe("administration étendue (actions et requêtes réelles)", () => {
  it("gère les catégories et les inscrit au journal de configuration", async () => {
    const admin = await createAdmin();
    actAs(admin);
    const name = `Animaux ${randomUUID().slice(0, 6)}`;
    expect(await createCategoryAction(idle, form({ name, slug: "" }))).toMatchObject({
      status: "success",
    });

    let category = (await getAdminCategories()).find((item) => item.name === name);
    expect(category).toMatchObject({ isActive: true, activeListings: 0 });
    const before = category!.sortOrder;

    await moveCategoryAction(form({ id: category!.id, direction: "-1" }));
    await toggleCategoryAction(form({ id: category!.id, active: "false" }));
    category = (await getAdminCategories()).find((item) => item.id === category!.id);
    expect(category?.isActive).toBe(false);
    expect(category!.sortOrder).toBeLessThan(before);

    const activity = await getConfigActivity(1);
    expect(activity.items.find((entry) => entry.summary === name)).toMatchObject({
      entity: "category",
      action: "created",
      adminUsername: admin.username,
    });

    // Doublon refusé avec un message lisible.
    expect(await createCategoryAction(idle, form({ name, slug: "" }))).toMatchObject({
      status: "error",
      message: "Cet élément existe déjà.",
    });
  });

  it("ajoute une ville proposée aussitôt aux vendeurs", async () => {
    const admin = await createAdmin();
    actAs(admin);
    const slug = `lolodorf-${randomUUID().slice(0, 6)}`;
    expect(
      await createCityAction(idle, form({ name: "Lolodorf", region: "Sud", slug })),
    ).toMatchObject({ status: "success" });
    expect((await getAdminCities()).some((city) => city.slug === slug)).toBe(true);

    actAs(null);
    expect((await getCities()).find((city) => city.slug === slug)).toEqual({
      slug,
      name: "Lolodorf",
      region: "Sud",
    });
    expect(await isAvailableCity(slug)).toBe(true);
    expect(await isAvailableCity("atlantide")).toBe(false);
  });

  it("publie puis retire le message global", async () => {
    const admin = await createAdmin();
    actAs(admin);
    const message = `Maintenance ${randomUUID().slice(0, 6)} ce soir.`;
    expect(
      await saveAnnouncementAction(
        idle,
        form({
          kind: "maintenance",
          message,
          linkUrl: "/aide",
          startsAt: "",
          endsAt: "",
          isActive: "on",
        }),
      ),
    ).toMatchObject({ status: "success" });

    actAs(null);
    const current = await getCurrentAnnouncement();
    expect(current).toMatchObject({ kind: "maintenance", message, linkUrl: "/aide" });

    actAs(admin);
    await toggleAnnouncementAction(form({ id: current!.id, active: "false" }));
    actAs(null);
    expect((await getCurrentAnnouncement())?.message).not.toBe(message);
  });

  it("filtre les annonces de l'administration (retirées, vendeur, statut)", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    const kept = await createActiveListing(seller.id, { title: "Lampe vintage" });
    const removed = await createActiveListing(seller.id, { title: "Montre douteuse" });

    actAs(admin);
    expect(
      await removeListingAction(
        idle,
        form({ listingId: removed, reason: "Contrefaçon", reportId: "" }),
      ),
    ).toMatchObject({ status: "success" });

    const bySeller = await getAdminListings(
      parseAdminListingFilters({ vendeur: `@${seller.username}` }),
    );
    expect(bySeller.items.map((item) => item.id).sort()).toEqual([kept, removed].sort());
    expect(bySeller.items.find((item) => item.id === removed)).toMatchObject({
      removedReason: "Contrefaçon",
      seller: { username: seller.username },
      category: "Mode femme",
    });

    const removedOnly = await getAdminListings(
      parseAdminListingFilters({ vendeur: seller.username, moderation: "retirees" }),
    );
    expect(removedOnly.items.map((item) => item.id)).toEqual([removed]);

    const active = await getAdminListings(
      parseAdminListingFilters({ vendeur: seller.username, statut: "active" }),
    );
    expect(active.items.map((item) => item.id)).toEqual([kept]);

    // Filtres invalides ignorés, vendeur inconnu : aucun résultat.
    expect(parseAdminListingFilters({ statut: "hack", ville: "Paris !" })).toMatchObject({
      status: null,
      city: null,
    });
    expect(
      (await getAdminListings(parseAdminListingFilters({ vendeur: "inconnu_zz" }))).total,
    ).toBe(0);
  });

  it("nomme un modérateur aux droits réduits", async () => {
    const admin = await createAdmin();
    const moderator = await createUser();
    const seller = await createUser();
    const listingId = await createActiveListing(seller.id);

    actAs(admin);
    expect(
      await setRoleAction(idle, form({ userId: moderator.id, role: "moderator", granted: "true" })),
    ).toEqual({ status: "success", message: "Rôle modérateur attribué." });
    expect(
      (await getStaffMembers()).find((member) => member.userId === moderator.id),
    ).toMatchObject({ role: "moderator", username: moderator.username });
    const search = await searchUsersForAdmin(moderator.username, 1);
    expect(search.items[0]).toMatchObject({ id: moderator.id, role: "moderator" });
    // Pas de modification de son propre rôle.
    expect(
      await setRoleAction(idle, form({ userId: admin.id, role: "admin", granted: "false" })),
    ).toMatchObject({ status: "error" });

    actAs(moderator);
    expect(await getCurrentStaffRole()).toBe("moderator");
    expect(
      await removeListingAction(
        idle,
        form({ listingId, reason: "Article interdit", reportId: "" }),
      ),
    ).toMatchObject({ status: "success" });
    expect(await createCategoryAction(idle, form({ name: "Piratage", slug: "" }))).toEqual({
      status: "error",
      message: "Action réservée à l'administration.",
    });
    expect(
      await setRoleAction(idle, form({ userId: seller.id, role: "admin", granted: "true" })),
    ).toMatchObject({ status: "error" });
  });

  it("exige la confirmation du pseudo et protège l'équipe avant toute suppression", async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();
    const user = await createUser();

    actAs(admin);
    expect(
      await deleteUserAction(idle, form({ userId: user.id, reason: "Fraude", confirmation: "x" })),
    ).toMatchObject({ status: "error", fieldErrors: { confirmation: expect.any(String) } });
    expect(
      await deleteUserAction(
        idle,
        form({ userId: otherAdmin.id, reason: "Fraude", confirmation: otherAdmin.username }),
      ),
    ).toEqual({
      status: "error",
      message: "Cette action n'est pas possible sur un membre de l'équipe.",
      values: { reason: "Fraude" },
    });

    actAs(user);
    expect(
      await deleteUserAction(
        idle,
        form({ userId: admin.id, reason: "Fraude", confirmation: admin.username }),
      ),
    ).toMatchObject({ status: "error", message: "Action réservée à l'administration." });
  });
});
