import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  formData,
  queryBuilder,
  type SupabaseMock,
} from "@/test/supabase-mock";

const TARGET = "4f1c2a3b-0000-4000-8000-0000000000aa";
let supabase: SupabaseMock | null;
let currentUser: { id: string; email: string } | null;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));

const { createReportAction, toggleBlockAction } = await import("./actions");

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: "u1", email: "a@b.cm" };
});

const report = (fields: Record<string, string>) =>
  createReportAction(
    { status: "idle" },
    formData({ targetType: "listing", targetId: TARGET, reason: "scam", details: "", ...fields }),
  );

describe("createReportAction", () => {
  it("valide le motif avant tout appel", async () => {
    const state = await report({ reason: "" });
    expect(state.fieldErrors?.reason).toBe("Choisissez un motif.");
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("enregistre le signalement sans fournir l'auteur", async () => {
    const insert = queryBuilder();
    supabase!.from.mockReturnValueOnce(insert);
    const state = await report({ details: "  Demande un paiement d'avance  " });
    expect(state.status).toBe("success");
    expect(insert.insert).toHaveBeenCalledWith({
      target_type: "listing",
      target_id: TARGET,
      reason: "scam",
      details: "Demande un paiement d'avance",
    });
  });

  it("explique les refus de la base", async () => {
    for (const [code, expected] of [
      ["23505", /déjà signalé/],
      ["PT429", /beaucoup de signalements/],
      ["P0002", /n'existe plus/],
    ] as const) {
      supabase!.from.mockReturnValueOnce(queryBuilder({ error: { code } }));
      expect((await report({})).message).toMatch(expected);
    }
  });

  it("exige une session", async () => {
    currentUser = null;
    expect((await report({})).status).toBe("error");
  });
});

describe("toggleBlockAction", () => {
  it("refuse de se bloquer soi-même ou un identifiant invalide", async () => {
    for (const userId of ["u1", "nope"]) {
      const state = await toggleBlockAction({ blocked: false }, formData({ userId }));
      expect(state.message).toBe("Utilisateur introuvable.");
    }
    currentUser = { id: TARGET, email: "a@b.cm" };
    const self = await toggleBlockAction({ blocked: false }, formData({ userId: TARGET }));
    expect(self.message).toBe("Utilisateur introuvable.");
  });

  it("bloque puis débloque selon l'état réel en base", async () => {
    const insert = queryBuilder();
    supabase!.from.mockReturnValueOnce(queryBuilder({ count: 0 })).mockReturnValueOnce(insert);
    expect(await toggleBlockAction({ blocked: false }, formData({ userId: TARGET }))).toEqual({
      blocked: true,
    });
    expect(insert.insert).toHaveBeenCalledWith({ blocked_id: TARGET });

    const remove = queryBuilder();
    supabase!.from.mockReturnValueOnce(queryBuilder({ count: 1 })).mockReturnValueOnce(remove);
    // L'état envoyé par le navigateur est ignoré.
    expect(await toggleBlockAction({ blocked: false }, formData({ userId: TARGET }))).toEqual({
      blocked: false,
    });
    expect(remove.delete).toHaveBeenCalled();
    expect(remove.eq).toHaveBeenCalledWith("blocker_id", "u1");
  });
});
