import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, formData, type SupabaseMock } from "@/test/supabase-mock";

const LISTING_ID = "4f1c2a3b-0000-4000-8000-0000000000aa";
const REPORT_ID = "4f1c2a3b-0000-4000-8000-0000000000cc";
const USER_ID = "4f1c2a3b-0000-4000-8000-0000000000ee";

let supabase: SupabaseMock | null;
let currentUser: { id: string; email: string } | null;
let admin: boolean;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));
vi.mock("./queries", () => ({ isCurrentUserAdmin: vi.fn(async () => admin) }));

const {
  removeListingAction,
  restoreListingAction,
  setUserSuspensionAction,
  updateReportStatusAction,
  viewReportedMessageAction,
} = await import("./actions");

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: "admin", email: "admin@b.cm" };
  admin = true;
});

describe("actions d'administration", () => {
  it("sont refusées aux non-administrateurs sans appel à la base", async () => {
    admin = false;
    const remove = await removeListingAction(
      { status: "idle" },
      formData({ listingId: LISTING_ID, reason: "Arnaque", reportId: "" }),
    );
    expect(remove).toEqual({ status: "error", message: "Action réservée à l'administration." });
    await restoreListingAction(formData({ listingId: LISTING_ID }));
    const view = await viewReportedMessageAction(REPORT_ID);
    expect(view.status).toBe("error");
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it("retire une annonce avec motif et signalement", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: null });
    const state = await removeListingAction(
      { status: "idle" },
      formData({ listingId: LISTING_ID, reason: "  Contrefaçon  ", reportId: REPORT_ID }),
    );
    expect(state.status).toBe("success");
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_remove_listing", {
      p_listing_id: LISTING_ID,
      p_reason: "Contrefaçon",
      p_report_id: REPORT_ID,
    });
  });

  it("exige un motif pour retirer ou suspendre", async () => {
    const remove = await removeListingAction(
      { status: "idle" },
      formData({ listingId: LISTING_ID, reason: "x", reportId: "" }),
    );
    expect(remove.fieldErrors?.reason).toMatch(/3 caractères/);
    const suspend = await setUserSuspensionAction(
      { status: "idle" },
      formData({ userId: USER_ID, suspended: "true", reason: "", reportId: "" }),
    );
    expect(suspend.fieldErrors?.reason).toMatch(/3 caractères/);
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it("réactive un compte sans motif et traduit les refus de la base", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: null });
    const ok = await setUserSuspensionAction(
      { status: "idle" },
      formData({ userId: USER_ID, suspended: "false", reason: "", reportId: "" }),
    );
    expect(ok).toEqual({ status: "success", message: "Compte réactivé." });

    supabase!.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    const denied = await setUserSuspensionAction(
      { status: "idle" },
      formData({ userId: USER_ID, suspended: "true", reason: "Arnaque", reportId: "" }),
    );
    expect(denied.message).toBe("Action réservée à l'administration.");
  });

  it("met à jour un signalement avec un statut autorisé uniquement", async () => {
    const invalid = await updateReportStatusAction(
      { status: "idle" },
      formData({ reportId: REPORT_ID, status: "pending", note: "" }),
    );
    expect(invalid.status).toBe("error");
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: null });
    await updateReportStatusAction(
      { status: "idle" },
      formData({ reportId: REPORT_ID, status: "dismissed", note: "Doublon" }),
    );
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_update_report", {
      p_report_id: REPORT_ID,
      p_status: "dismissed",
      p_note: "Doublon",
    });
  });

  it("renvoie le message signalé", async () => {
    supabase!.rpc.mockResolvedValueOnce({
      data: [{ body: "Envoie l'argent", created_at: "2026-10-18T10:00:00Z", sender_username: "x" }],
      error: null,
    });
    expect(await viewReportedMessageAction(REPORT_ID)).toEqual({
      status: "ok",
      message: {
        body: "Envoie l'argent",
        photoUrl: null,
        createdAt: "2026-10-18T10:00:00Z",
        senderUsername: "x",
      },
    });
  });
});
