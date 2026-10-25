import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addBannedWordAction,
  saveAntiSpamSettingsAction,
} from "@/features/admin/management-actions";
import {
  findUsersByContact,
  getAdminTrends,
  getAntiSpamSettings,
  getBannedWords,
  getDuplicateListings,
} from "@/features/admin/management-queries";
import { getModerationLog, parseModerationLogFilters } from "@/features/admin/queries";
import { saveListingAction } from "@/features/listings/actions";
import { setUserSuspensionAction } from "@/features/admin/actions";
import { asOwner, createActiveListing, createUser, makeAdmin } from "../support/db";
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

describe("tendances, recherche et anti-spam (actions et requêtes réelles)", () => {
  it("donne les tendances et retrouve un compte par e-mail", async () => {
    const admin = await createAdmin();
    const target = await createUser();
    const { rows } = await asOwner((sql) =>
      sql<{ email: string }>("select email from auth.users where id = $1", [target.id]),
    );

    actAs(admin);
    const trends = await getAdminTrends(7);
    expect(trends.days).toHaveLength(7);
    expect(trends.days.at(-1)!.users).toBeGreaterThanOrEqual(2);

    expect(await findUsersByContact(rows[0]!.email)).toEqual([
      expect.objectContaining({ id: target.id, username: target.username, email: rows[0]!.email }),
    ]);
  });

  it("filtre le journal par action et par membre de l'équipe", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    actAs(admin);
    expect(
      await setUserSuspensionAction(
        idle,
        form({ userId: user.id, suspended: "true", reason: "Spam", reportId: "", duration: "7d" }),
      ),
    ).toMatchObject({ status: "success" });

    const filters = parseModerationLogFilters({
      action: "user_suspended",
      membre: `@${admin.username}`,
    });
    const log = await getModerationLog(1, filters);
    expect(log.items.map((entry) => entry.targetId)).toEqual([user.id]);
    expect(log.items[0]!.note).toMatch(/^Spam \(jusqu'au /);

    const none = await getModerationLog(1, { ...filters, action: "listing_removed" });
    expect(none.total).toBe(0);
    expect(parseModerationLogFilters({ action: "hack", du: "hier" })).toMatchObject({
      action: null,
      from: null,
    });
  });

  it("bloque un mot interdit côté vendeur avec un message clair", async () => {
    const admin = await createAdmin();
    const seller = await createUser();
    const word = `arnak${randomUUID().slice(0, 6)}`;

    actAs(admin);
    expect(await addBannedWordAction(idle, form({ word: word.toUpperCase() }))).toMatchObject({
      status: "success",
    });
    expect((await getBannedWords()).map((item) => item.word)).toContain(word);
    const settings = await getAntiSpamSettings();
    expect(
      await saveAntiSpamSettingsAction(
        idle,
        form({
          newAccountDays: String(settings.newAccountDays),
          newAccountDailyListings: String(settings.newAccountDailyListings),
        }),
      ),
    ).toEqual({ status: "success", message: "Réglages enregistrés." });

    actAs(seller);
    const result = await saveListingAction(
      null,
      form({
        title: `Montre ${word} neuve`,
        description: "Montre jamais portée, avec sa boîte.",
        category: "",
        condition: "",
        price: "",
        city: "",
        intent: "draft",
      }),
    );
    expect(result).toMatchObject({
      status: "error",
      message: expect.stringMatching(/terme interdit/),
    });
    expect(await addBannedWordAction(idle, form({ word: "spam" }))).toMatchObject({
      status: "error",
      message: "Action réservée à l'administration.",
    });
  });

  it("liste les doublons probables avec leurs annonces", async () => {
    const moderator = await createUser();
    await asOwner((sql) =>
      sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [moderator.id]),
    );
    const seller = await createUser();
    const title = `Vélo ${randomUUID().slice(0, 6)} enfant`;
    const first = await createActiveListing(seller.id, { title });
    const second = await createActiveListing(seller.id, { title });

    actAs(moderator);
    const group = (await getDuplicateListings()).find((item) =>
      item.listings.some((listing) => listing.id === first),
    );
    expect(group?.listings.map((listing) => listing.id).sort()).toEqual([first, second].sort());
    expect(group?.listings[0]).toMatchObject({ sellerUsername: seller.username, status: "active" });
  });
});
