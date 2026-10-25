import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  formData,
  queryBuilder,
  RedirectError,
  type SupabaseMock,
} from "@/test/supabase-mock";

const USER_ID = "4f1c2a3b-0000-4000-8000-000000000001";
const OTHER_ID = "4f1c2a3b-0000-4000-8000-000000000002";

let supabase: SupabaseMock | null;
let currentUser: { id: string; email: string } | null;

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));
vi.mock("@/features/locations/queries", async () => {
  const { cities } = await import("@/config/locations");
  return {
    isAvailableCity: vi.fn(async (slug: string) => cities.some((city) => city.slug === slug)),
  };
});

const { toggleFollowAction, updatePrivateContactAction, updateProfileAction } =
  await import("./actions");

const idle = { status: "idle" as const };
const profileFields = {
  username: "awa_237",
  displayName: "Awa",
  bio: "",
  city: "douala",
  avatarPath: "",
};

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: USER_ID, email: "awa@example.cm" };
});

describe("updateProfileAction", () => {
  it("refuse une ville qui n'est pas proposée", async () => {
    const state = await updateProfileAction(idle, formData({ ...profileFields, city: "paris" }));
    expect(state.fieldErrors).toEqual({ city: "Ville invalide." });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("exige une session", async () => {
    currentUser = null;
    const state = await updateProfileAction(idle, formData(profileFields));
    expect(state.message).toMatch(/session a expiré/);
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("refuse un avatar situé dans le dossier d'un autre utilisateur", async () => {
    const state = await updateProfileAction(
      idle,
      formData({ ...profileFields, avatarPath: `${OTHER_ID}/photo.webp` }),
    );
    expect(state.fieldErrors?.avatarPath).toBe("Photo de profil invalide.");
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("enregistre le profil et supprime l'ancienne photo remplacée", async () => {
    const current = queryBuilder({
      data: { username: "awa_237", avatar_path: `${USER_ID}/old.webp` },
    });
    const update = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(current).mockReturnValueOnce(update);

    const state = await updateProfileAction(
      idle,
      formData({ ...profileFields, bio: "  Vide-dressing  ", avatarPath: `${USER_ID}/new.webp` }),
    );

    expect(state.status).toBe("success");
    expect(update.update).toHaveBeenCalledWith({
      username: "awa_237",
      display_name: "Awa",
      bio: "Vide-dressing",
      city: "douala",
      avatar_path: `${USER_ID}/new.webp`,
    });
    expect(update.eq).toHaveBeenCalledWith("id", USER_ID);
    expect(supabase!.storage.bucket.remove).toHaveBeenCalledWith([`${USER_ID}/old.webp`]);
  });

  it("retire la photo de profil sur demande", async () => {
    const current = queryBuilder({
      data: { username: "awa_237", avatar_path: `${USER_ID}/old.webp` },
    });
    const update = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(current).mockReturnValueOnce(update);
    await updateProfileAction(idle, formData({ ...profileFields, avatarPath: "-" }));
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_path: null }));
  });

  it("conserve la photo si aucune nouvelle n'est envoyée", async () => {
    const current = queryBuilder({
      data: { username: "awa_237", avatar_path: `${USER_ID}/old.webp` },
    });
    const update = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(current).mockReturnValueOnce(update);
    await updateProfileAction(idle, formData(profileFields));
    expect(update.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ avatar_path: expect.anything() }),
    );
    expect(supabase!.storage.bucket.remove).not.toHaveBeenCalled();
  });

  it("signale un nom d'utilisateur déjà pris", async () => {
    supabase!.from
      .mockReturnValueOnce(queryBuilder({ data: { username: "awa", avatar_path: null } }))
      .mockReturnValueOnce(queryBuilder({ error: { code: "23505" } }));
    const state = await updateProfileAction(idle, formData(profileFields));
    expect(state.fieldErrors?.username).toBe("Ce nom d'utilisateur est déjà pris.");
  });
});

describe("updatePrivateContactAction", () => {
  it("normalise le numéro au format international", async () => {
    const update = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(update);
    const state = await updatePrivateContactAction(idle, formData({ phone: "6 90 00 00 00" }));
    expect(state.status).toBe("success");
    expect(update.update).toHaveBeenCalledWith({ phone: "+237690000000" });
    expect(update.eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("refuse un numéro invalide", async () => {
    const state = await updatePrivateContactAction(idle, formData({ phone: "123" }));
    expect(state.fieldErrors?.phone).toMatch(/Numéro invalide/);
  });
});

describe("toggleFollowAction", () => {
  it("ignore une tentative de se suivre soi-même", async () => {
    const state = await toggleFollowAction(
      { following: false },
      formData({ profileId: USER_ID, username: "awa" }),
    );
    expect(state).toEqual({ following: false });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("s'abonne puis se désabonne", async () => {
    const insert = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(queryBuilder({ count: 0 })).mockReturnValueOnce(insert);
    const followed = await toggleFollowAction(
      { following: false },
      formData({ profileId: OTHER_ID, username: "seller" }),
    );
    expect(followed).toEqual({ following: true });
    expect(insert.insert).toHaveBeenCalledWith({ following_id: OTHER_ID });

    const remove = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(queryBuilder({ count: 1 })).mockReturnValueOnce(remove);
    const unfollowed = await toggleFollowAction(
      followed,
      formData({ profileId: OTHER_ID, username: "seller" }),
    );
    expect(unfollowed).toEqual({ following: false });
    expect(remove.delete).toHaveBeenCalled();
  });

  it("affiche un message si l'abonnement est refusé (blocage)", async () => {
    supabase!.from
      .mockReturnValueOnce(queryBuilder({ count: 0 }))
      .mockReturnValueOnce(queryBuilder({ error: { code: "42501" } }));
    const state = await toggleFollowAction(
      { following: false },
      formData({ profileId: OTHER_ID, username: "seller" }),
    );
    expect(state).toEqual({ following: false, message: "Impossible de suivre ce profil." });
  });
});
