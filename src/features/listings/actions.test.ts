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
const LISTING_ID = "4f1c2a3b-0000-4000-8000-0000000000aa";
const CATEGORY_ID = "4f1c2a3b-0000-4000-8000-0000000000cc";

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

const { deleteListingAction, finalizeListingAction, saveListingAction, updateListingStatusAction } =
  await import("./actions");

const fields = {
  title: "Robe en wax",
  description: "Portée deux fois, très bon état.",
  category: "mode-femme",
  condition: "very_good",
  price: "15 000",
  city: "douala",
};

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: USER_ID, email: "awa@example.cm" };
});

describe("saveListingAction", () => {
  it("refuse de publier une annonce incomplète sans rien enregistrer", async () => {
    const result = await saveListingAction(
      null,
      formData({ ...fields, price: "", city: "", intent: "publish" }),
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { price: "Indiquez un prix.", city: "Indiquez la ville." },
    });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("accepte un brouillon incomplet", async () => {
    const insert = queryBuilder({ data: { id: LISTING_ID } });
    supabase!.from.mockReturnValueOnce(insert);
    const result = await saveListingAction(
      null,
      formData({ ...fields, category: "", price: "", intent: "draft" }),
    );
    expect(result).toEqual({ status: "saved", listingId: LISTING_ID });
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: null, price: null, title: "Robe en wax" }),
    );
  });

  it("résout la catégorie et crée l'annonce", async () => {
    const category = queryBuilder({ data: { id: CATEGORY_ID } });
    const insert = queryBuilder({ data: { id: LISTING_ID } });
    supabase!.from.mockReturnValueOnce(category).mockReturnValueOnce(insert);
    const result = await saveListingAction(null, formData({ ...fields, intent: "publish" }));
    expect(result).toEqual({ status: "saved", listingId: LISTING_ID });
    expect(category.eq).toHaveBeenCalledWith("slug", "mode-femme");
    expect(insert.insert).toHaveBeenCalledWith({
      title: "Robe en wax",
      description: "Portée deux fois, très bon état.",
      price: 15000,
      condition: "very_good",
      city: "douala",
      category_id: CATEGORY_ID,
    });
  });

  it("signale une catégorie inconnue", async () => {
    supabase!.from.mockReturnValueOnce(queryBuilder({ data: null }));
    const result = await saveListingAction(null, formData({ ...fields, intent: "draft" }));
    expect(result).toMatchObject({ fieldErrors: { category: "Catégorie invalide." } });
  });

  it("refuse une ville qui n'est pas proposée", async () => {
    supabase!.from.mockReturnValueOnce(queryBuilder({ data: { id: CATEGORY_ID } }));
    const result = await saveListingAction(
      null,
      formData({ ...fields, city: "paris", intent: "draft" }),
    );
    expect(result).toMatchObject({ fieldErrors: { city: "Ville invalide." } });
    expect(supabase!.from).toHaveBeenCalledTimes(1);
  });

  it("limite la mise à jour aux annonces du vendeur connecté", async () => {
    supabase!.from
      .mockReturnValueOnce(queryBuilder({ data: { id: CATEGORY_ID } }))
      .mockReturnValueOnce(queryBuilder({ data: null }));
    const result = await saveListingAction(LISTING_ID, formData({ ...fields, intent: "publish" }));
    expect(result).toEqual({ status: "error", message: "Annonce introuvable." });
    const update = supabase!.from.mock.results[1]!.value as ReturnType<typeof queryBuilder>;
    expect(update.eq).toHaveBeenCalledWith("seller_id", USER_ID);
  });

  it("traduit la limite anti-spam", async () => {
    supabase!.from
      .mockReturnValueOnce(queryBuilder({ data: { id: CATEGORY_ID } }))
      .mockReturnValueOnce(queryBuilder({ error: { code: "PT429" } }));
    const result = await saveListingAction(null, formData({ ...fields, intent: "draft" }));
    expect(result).toMatchObject({ message: expect.stringMatching(/Réessayez demain/) });
  });

  it("exige une session", async () => {
    currentUser = null;
    const result = await saveListingAction(null, formData({ ...fields, intent: "draft" }));
    expect(result).toMatchObject({ message: expect.stringMatching(/session/) });
  });
});

describe("finalizeListingAction", () => {
  const ownPath = `${USER_ID}/${LISTING_ID}/photo.webp`;

  it("refuse une photo hors du dossier du vendeur et de l'annonce", async () => {
    const other = "4f1c2a3b-0000-4000-8000-000000000099";
    const result = await finalizeListingAction({
      listingId: LISTING_ID,
      images: [{ path: `${other}/${LISTING_ID}/photo.webp` }],
      publish: true,
    });
    expect(result).toEqual({ status: "error", message: "Photos invalides." });
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it("exige une photo pour publier", async () => {
    supabase!.from.mockReturnValueOnce(queryBuilder({ data: { status: "draft" } }));
    const result = await finalizeListingAction({
      listingId: LISTING_ID,
      images: [],
      publish: true,
    });
    expect(result).toEqual({ status: "error", message: "Ajoutez au moins une photo." });
  });

  it("synchronise les photos, supprime les anciennes et publie", async () => {
    const status = queryBuilder({ data: { status: "draft" } });
    const publish = queryBuilder({ error: null });
    supabase!.from.mockReturnValueOnce(status).mockReturnValueOnce(publish);
    supabase!.rpc.mockResolvedValueOnce({ data: ["ancien/chemin.webp"], error: null } as never);

    const result = await finalizeListingAction({
      listingId: LISTING_ID,
      images: [{ path: ownPath }],
      publish: true,
    });

    expect(result).toEqual({ status: "ok", listingId: LISTING_ID });
    expect(supabase!.rpc).toHaveBeenCalledWith("sync_listing_images", {
      p_listing_id: LISTING_ID,
      p_images: [{ path: ownPath }],
    });
    expect(supabase!.storage.bucket.remove).toHaveBeenCalledWith(["ancien/chemin.webp"]);
    expect(publish.update).toHaveBeenCalledWith({ status: "active" });
  });

  it("ne republie pas une annonce déjà publiée", async () => {
    supabase!.from.mockReturnValueOnce(queryBuilder({ data: { status: "sold" } }));
    supabase!.rpc.mockResolvedValueOnce({ data: [], error: null } as never);
    await finalizeListingAction({
      listingId: LISTING_ID,
      images: [{ path: ownPath }],
      publish: true,
    });
    expect(supabase!.from).toHaveBeenCalledTimes(1);
  });
});

describe("statut et suppression", () => {
  it("refuse un statut non autorisé", async () => {
    const state = await updateListingStatusAction(
      {},
      formData({ listingId: LISTING_ID, status: "draft" }),
    );
    expect(state.message).toBe("Action invalide.");
  });

  it("explique qu'une annonce modérée ne peut pas être remise en ligne", async () => {
    supabase!.from.mockReturnValueOnce(
      queryBuilder({ error: { code: "P0001", message: "listing_removed_by_moderation" } }),
    );
    const state = await updateListingStatusAction(
      {},
      formData({ listingId: LISTING_ID, status: "active" }),
    );
    expect(state.message).toMatch(/retirée par la modération/);
  });

  it("supprime l'annonce, ses fichiers, puis redirige", async () => {
    supabase!.from
      .mockReturnValueOnce(queryBuilder({ data: [{ storage_path: "a.webp" }] }))
      .mockReturnValueOnce(queryBuilder({ data: { id: LISTING_ID } }));
    await expectRedirect(
      deleteListingAction({}, formData({ listingId: LISTING_ID })),
      "/profil?annonce=supprimee",
    );
    expect(supabase!.storage.bucket.remove).toHaveBeenCalledWith(["a.webp"]);
  });
});
