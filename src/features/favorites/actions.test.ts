import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  formData,
  queryBuilder,
  type SupabaseMock,
} from "@/test/supabase-mock";

const LISTING_ID = "4f1c2a3b-0000-4000-8000-0000000000aa";
let supabase: SupabaseMock | null;
let currentUser: { id: string; email: string } | null;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));

const { toggleFavoriteAction } = await import("./actions");

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: "u1", email: "a@b.cm" };
});

describe("toggleFavoriteAction", () => {
  it("exige une session", async () => {
    currentUser = null;
    const state = await toggleFavoriteAction(
      { favorited: false },
      formData({ listingId: LISTING_ID }),
    );
    expect(state).toEqual({
      favorited: false,
      message: "Connectez-vous pour ajouter des favoris.",
    });
  });

  it("refuse un identifiant invalide", async () => {
    const state = await toggleFavoriteAction({ favorited: false }, formData({ listingId: "x" }));
    expect(state.message).toBe("Annonce introuvable.");
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("ajoute puis retire un favori", async () => {
    const insert = queryBuilder();
    supabase!.from.mockReturnValueOnce(queryBuilder({ count: 0 })).mockReturnValueOnce(insert);
    const added = await toggleFavoriteAction(
      { favorited: false },
      formData({ listingId: LISTING_ID }),
    );
    expect(added).toEqual({ favorited: true });
    expect(insert.insert).toHaveBeenCalledWith({ listing_id: LISTING_ID });

    const remove = queryBuilder();
    supabase!.from.mockReturnValueOnce(queryBuilder({ count: 1 })).mockReturnValueOnce(remove);
    const removed = await toggleFavoriteAction(added, formData({ listingId: LISTING_ID }));
    expect(removed).toEqual({ favorited: false });
    expect(remove.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("signale un refus (annonce non publiée)", async () => {
    supabase!.from
      .mockReturnValueOnce(queryBuilder({ count: 0 }))
      .mockReturnValueOnce(queryBuilder({ error: { code: "42501" } }));
    const state = await toggleFavoriteAction(
      { favorited: false },
      formData({ listingId: LISTING_ID }),
    );
    expect(state).toEqual({ favorited: false, message: "Impossible de modifier vos favoris." });
  });
});
