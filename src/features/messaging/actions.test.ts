import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  expectRedirect,
  formData,
  queryBuilder,
  RedirectError,
  type SupabaseMock,
} from "@/test/supabase-mock";

const LISTING_ID = "4f1c2a3b-0000-4000-8000-0000000000aa";
const CONVERSATION_ID = "4f1c2a3b-0000-4000-8000-0000000000bb";

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

const {
  loadOlderMessagesAction,
  markConversationReadAction,
  sendMessageAction,
  startConversationAction,
} = await import("./actions");

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = { id: "u1", email: "a@b.cm" };
});

describe("startConversationAction", () => {
  it("redirige vers la connexion sans session", async () => {
    currentUser = null;
    await expectRedirect(
      startConversationAction({}, formData({ listingId: LISTING_ID })),
      `/connexion?next=${encodeURIComponent(`/annonces/${LISTING_ID}`)}`,
    );
  });

  it("refuse un identifiant d'annonce invalide", async () => {
    const state = await startConversationAction({}, formData({ listingId: "../admin" }));
    expect(state.message).toBe("Annonce introuvable.");
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it("ouvre la conversation renvoyée par la base", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: CONVERSATION_ID, error: null });
    await expectRedirect(
      startConversationAction({}, formData({ listingId: LISTING_ID })),
      `/messages/${CONVERSATION_ID}`,
    );
    expect(supabase!.rpc).toHaveBeenCalledWith("get_or_create_conversation", {
      p_listing_id: LISTING_ID,
    });
  });

  it("traduit les refus de la base", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: { code: "PT429" } });
    expect(
      (await startConversationAction({}, formData({ listingId: LISTING_ID }))).message,
    ).toMatch(/beaucoup de vendeurs/);
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: { code: "23514" } });
    expect(
      (await startConversationAction({}, formData({ listingId: LISTING_ID }))).message,
    ).toMatch(/vous-même/);
    supabase!.rpc.mockResolvedValueOnce({ data: null, error: { code: "P0002" } });
    expect(
      (await startConversationAction({}, formData({ listingId: LISTING_ID }))).message,
    ).toMatch(/plus disponible/);
  });
});

describe("sendMessageAction", () => {
  it("refuse un message vide ou trop long", async () => {
    expect(await sendMessageAction(CONVERSATION_ID, "   ")).toMatchObject({ status: "error" });
    expect(await sendMessageAction(CONVERSATION_ID, "a".repeat(2001))).toMatchObject({
      status: "error",
    });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("refuse une conversation invalide ou une session expirée", async () => {
    expect(await sendMessageAction("x", "Bonjour")).toMatchObject({ status: "error" });
    currentUser = null;
    expect(await sendMessageAction(CONVERSATION_ID, "Bonjour")).toEqual({
      status: "error",
      message: "Votre session a expiré. Reconnectez-vous.",
    });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("insère le message sans jamais fournir l'expéditeur", async () => {
    const message = {
      id: "m1",
      conversation_id: CONVERSATION_ID,
      sender_id: "u1",
      body: "Bonjour, toujours disponible ?",
      attachment_path: null,
      created_at: "2026-10-18T10:00:00Z",
      read_at: null,
    };
    const insert = queryBuilder({ data: message });
    supabase!.from.mockReturnValueOnce(insert);
    const result = await sendMessageAction(CONVERSATION_ID, "  Bonjour, toujours disponible ?  ");
    expect(result).toEqual({ status: "sent", message });
    expect(insert.insert).toHaveBeenCalledWith({
      conversation_id: CONVERSATION_ID,
      body: "Bonjour, toujours disponible ?",
      attachment_path: null,
    });
  });

  it("envoie une photo avec ou sans texte, et refuse un chemin étranger", async () => {
    const photo = `${CONVERSATION_ID}/4f1c2a3b-0000-4000-8000-0000000000cc.webp`;
    const insert = queryBuilder({ data: { id: "m2" } });
    supabase!.from.mockReturnValueOnce(insert);
    expect(await sendMessageAction(CONVERSATION_ID, "  ", photo)).toMatchObject({
      status: "sent",
    });
    expect(insert.insert).toHaveBeenCalledWith({
      conversation_id: CONVERSATION_ID,
      body: null,
      attachment_path: photo,
    });

    for (const path of [
      `${LISTING_ID}/4f1c2a3b-0000-4000-8000-0000000000cc.webp`,
      `${CONVERSATION_ID}/../avatars/x.webp`,
      `${CONVERSATION_ID}/photo.exe`,
    ]) {
      expect(await sendMessageAction(CONVERSATION_ID, "", path)).toEqual({
        status: "error",
        message: "Photo invalide.",
      });
    }
    expect(supabase!.from).toHaveBeenCalledTimes(1);
  });

  it("supprime la photo déposée si le message est refusé", async () => {
    const photo = `${CONVERSATION_ID}/4f1c2a3b-0000-4000-8000-0000000000cc.jpg`;
    supabase!.from.mockReturnValueOnce(queryBuilder({ error: { code: "42501" } }));
    expect(await sendMessageAction(CONVERSATION_ID, "Regardez", photo)).toMatchObject({
      status: "error",
    });
    expect(supabase!.storage.bucket.remove).toHaveBeenCalledWith([photo]);
  });

  it("signale la limite d'envoi et les refus RLS", async () => {
    supabase!.from.mockReturnValueOnce(queryBuilder({ error: { code: "PT429" } }));
    expect(await sendMessageAction(CONVERSATION_ID, "Salut")).toMatchObject({
      message: expect.stringMatching(/beaucoup de messages/),
    });
    supabase!.from.mockReturnValueOnce(queryBuilder({ error: { code: "42501" } }));
    expect(await sendMessageAction(CONVERSATION_ID, "Salut")).toMatchObject({
      message: expect.stringMatching(/Impossible d'envoyer/),
    });
  });
});

describe("markConversationReadAction et loadOlderMessagesAction", () => {
  it("ignore les identifiants invalides", async () => {
    await markConversationReadAction("nope");
    const empty = { messages: [], photoUrls: {} };
    expect(await loadOlderMessagesAction("nope", "2026-10-18T10:00:00Z")).toEqual(empty);
    expect(await loadOlderMessagesAction(CONVERSATION_ID, "pas une date")).toEqual(empty);
    expect(supabase!.rpc).not.toHaveBeenCalled();
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("marque la conversation comme lue", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: 2, error: null });
    await markConversationReadAction(CONVERSATION_ID);
    expect(supabase!.rpc).toHaveBeenCalledWith("mark_conversation_read", {
      p_conversation_id: CONVERSATION_ID,
    });
  });

  it("renvoie les messages plus anciens dans l'ordre chronologique", async () => {
    const select = queryBuilder({
      data: [
        { id: "m2", created_at: "2026-10-18T09:00:00Z" },
        { id: "m1", created_at: "2026-10-18T08:00:00Z" },
      ],
    });
    supabase!.from.mockReturnValueOnce(select);
    const older = await loadOlderMessagesAction(CONVERSATION_ID, "2026-10-18T10:00:00Z");
    expect(older.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(older.photoUrls).toEqual({});
    expect(select.lt).toHaveBeenCalledWith("created_at", "2026-10-18T10:00:00Z");
  });
});
