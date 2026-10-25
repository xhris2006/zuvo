import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  expectRedirect,
  formData,
  queryBuilder,
  RedirectError,
  type SupabaseMock,
} from "@/test/supabase-mock";

const USER_ID = "4f1c2a3b-0000-4000-8000-000000000001";
let supabase: SupabaseMock | null;
let currentUser: { id: string; email: string } | null;
let admin: ReturnType<typeof createAdminMock> | null;

function createAdminMock() {
  const buckets: Record<
    string,
    { list: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
  > = {};
  const bucket = (name: string) => {
    buckets[name] ??= {
      list: vi.fn(async (prefix: string) => {
        if (name === "avatars") return { data: [{ id: "f1", name: "avatar.webp" }], error: null };
        if (prefix === USER_ID) return { data: [{ id: null, name: "listing-1" }], error: null };
        return { data: [{ id: "f2", name: "photo.webp" }], error: null };
      }),
      remove: vi.fn(async () => ({ data: [], error: null })),
    };
    return buckets[name];
  };
  return {
    buckets,
    storage: { from: vi.fn(bucket) },
    auth: { admin: { deleteUser: vi.fn(async () => ({ data: {}, error: null })) } },
  };
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn(() => admin) }));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));

const { deleteAccountAction } = await import("./actions");

beforeEach(() => {
  supabase = createSupabaseMock();
  supabase.from.mockReturnValue(queryBuilder({ data: { username: "awa_237" } }));
  currentUser = { id: USER_ID, email: "awa@example.cm" };
  admin = createAdminMock();
});

const submit = (confirmation: string) =>
  deleteAccountAction({ status: "idle" }, formData({ confirmation }));

describe("deleteAccountAction", () => {
  it("exige une session", async () => {
    currentUser = null;
    expect((await submit("awa_237")).status).toBe("error");
    expect(admin!.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("exige le nom d'utilisateur exact", async () => {
    const state = await submit("awa");
    expect(state.fieldErrors?.confirmation).toMatch(/nom d'utilisateur/);
    expect(admin!.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("explique honnêtement l'absence de configuration serveur", async () => {
    admin = null;
    const state = await submit("awa_237");
    expect(state.message).toMatch(/pas encore activée/);
  });

  it("supprime le compte de la session puis ses fichiers, et déconnecte", async () => {
    await expectRedirect(submit(" @Awa_237 "), "/bienvenue?compte=supprime");
    expect(admin!.auth.admin.deleteUser).toHaveBeenCalledWith(USER_ID);
    expect(admin!.buckets.avatars!.remove).toHaveBeenCalledWith([`${USER_ID}/avatar.webp`]);
    expect(admin!.buckets["listing-images"]!.remove).toHaveBeenCalledWith([
      `${USER_ID}/listing-1/photo.webp`,
    ]);
    expect(supabase!.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("ne supprime aucun fichier si la suppression du compte échoue", async () => {
    admin!.auth.admin.deleteUser.mockResolvedValueOnce({
      data: null,
      error: { status: 500 },
    } as never);
    const state = await submit("awa_237");
    expect(state.message).toMatch(/a échoué/);
    expect(admin!.buckets.avatars?.remove).not.toHaveBeenCalled();
  });
});
