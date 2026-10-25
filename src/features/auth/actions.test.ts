import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  expectRedirect,
  formData,
  RedirectError,
  type SupabaseMock,
} from "@/test/supabase-mock";

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
vi.mock("./session", () => ({ getCurrentUser: vi.fn(async () => currentUser) }));

const {
  forgotPasswordAction,
  signInAction,
  signInWithGoogleAction,
  signUpAction,
  updatePasswordAction,
  verifyEmailLinkAction,
} = await import("./actions");

const idle = { status: "idle" as const };

beforeEach(() => {
  supabase = createSupabaseMock();
  currentUser = null;
});

describe("signInAction", () => {
  it("valide les champs sans contacter Supabase", async () => {
    const state = await signInAction(idle, formData({ email: "pas-un-email", password: "" }));
    expect(state.fieldErrors).toMatchObject({
      email: "Adresse e-mail invalide.",
      password: "Indiquez votre mot de passe.",
    });
    expect(supabase!.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("indique que le service n'est pas configuré", async () => {
    supabase = null;
    const state = await signInAction(idle, formData({ email: "a@b.cm", password: "x" }));
    expect(state.message).toMatch(/pas encore disponible/);
  });

  it("traduit l'erreur sans renvoyer le mot de passe", async () => {
    supabase!.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { code: "invalid_credentials", status: 400 },
    } as never);
    const state = await signInAction(
      idle,
      formData({ email: "Awa@Example.cm", password: "secret123" }),
    );
    expect(state).toMatchObject({
      status: "error",
      message: "E-mail ou mot de passe incorrect.",
      code: "invalid_credentials",
      values: { email: "Awa@Example.cm" },
    });
    expect(JSON.stringify(state)).not.toContain("secret123");
    expect(supabase!.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "awa@example.cm",
      password: "secret123",
    });
  });

  it("redirige vers la page demandée si elle est interne", async () => {
    await expectRedirect(
      signInAction(idle, formData({ email: "a@b.cm", password: "x", next: "/messages" })),
      "/messages",
    );
  });

  it("ignore une destination externe", async () => {
    await expectRedirect(
      signInAction(idle, formData({ email: "a@b.cm", password: "x", next: "//evil.example" })),
      "/",
    );
  });
});

describe("signUpAction", () => {
  const valid = {
    username: "Awa_237",
    displayName: "Awa",
    email: "Awa@Example.cm",
    password: "motdepasse1",
    acceptTerms: "on",
  };

  it("refuse un nom d'utilisateur déjà pris avant toute inscription", async () => {
    supabase!.rpc.mockResolvedValueOnce({ data: false, error: null } as never);
    const state = await signUpAction(idle, formData(valid));
    expect(state.fieldErrors?.username).toBe("Ce nom d'utilisateur est déjà pris.");
    expect(supabase!.auth.signUp).not.toHaveBeenCalled();
  });

  it("crée le compte avec les métadonnées et demande de vérifier l'e-mail", async () => {
    await expectRedirect(signUpAction(idle, formData(valid)), "/inscription/verification");
    expect(supabase!.rpc).toHaveBeenCalledWith("is_username_available", { p_username: "awa_237" });
    expect(supabase!.auth.signUp).toHaveBeenCalledWith({
      email: "awa@example.cm",
      password: "motdepasse1",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=%2F",
        data: { username: "awa_237", display_name: "Awa" },
      },
    });
  });

  it("ne révèle pas qu'une adresse possède déjà un compte", async () => {
    supabase!.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "user_already_exists", status: 422 },
    } as never);
    await expectRedirect(signUpAction(idle, formData(valid)), "/inscription/verification");
  });

  it("connecte directement si la confirmation d'e-mail est désactivée", async () => {
    supabase!.auth.signUp.mockResolvedValueOnce({
      data: { user: {}, session: { access_token: "t" } },
      error: null,
    } as never);
    await expectRedirect(signUpAction(idle, formData(valid)), "/");
  });

  it("exige l'acceptation des conditions", async () => {
    const state = await signUpAction(idle, formData({ ...valid, acceptTerms: "" }));
    expect(state.fieldErrors?.acceptTerms).toBeDefined();
    expect(state.values).not.toHaveProperty("password");
  });
});

describe("forgotPasswordAction", () => {
  it("répond de la même façon que le compte existe ou non", async () => {
    supabase!.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { code: "user_not_found", status: 400 },
    } as never);
    const state = await forgotPasswordAction(idle, formData({ email: "inconnu@example.cm" }));
    expect(state.status).toBe("success");
    expect(supabase!.auth.resetPasswordForEmail).toHaveBeenCalledWith("inconnu@example.cm", {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Freinitialiser-mot-de-passe",
    });
  });

  it("signale une panne du service plutôt qu'un faux succès", async () => {
    supabase!.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { code: "unexpected_failure", status: 0 },
    } as never);
    const state = await forgotPasswordAction(idle, formData({ email: "a@example.cm" }));
    expect(state).toMatchObject({
      status: "error",
      message: expect.stringMatching(/momentanément indisponible/),
    });
  });

  it("signale la limite d'envoi", async () => {
    supabase!.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    } as never);
    const state = await forgotPasswordAction(idle, formData({ email: "a@example.cm" }));
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/Trop/) });
  });
});

describe("updatePasswordAction", () => {
  it("exige une session", async () => {
    const state = await updatePasswordAction(
      idle,
      formData({ password: "motdepasse1", confirmPassword: "motdepasse1" }),
    );
    expect(state.message).toMatch(/session a expiré/);
    expect(supabase!.auth.updateUser).not.toHaveBeenCalled();
  });

  it("met à jour le mot de passe de l'utilisateur connecté", async () => {
    currentUser = { id: "u1", email: "a@b.cm" };
    const state = await updatePasswordAction(
      idle,
      formData({ password: "motdepasse1", confirmPassword: "motdepasse1" }),
    );
    expect(state.status).toBe("success");
    expect(supabase!.auth.updateUser).toHaveBeenCalledWith({ password: "motdepasse1" });
  });
});

describe("verifyEmailLinkAction", () => {
  it("refuse un type de lien inconnu sans appeler Supabase", async () => {
    await expectRedirect(
      verifyEmailLinkAction(formData({ token_hash: "abc", type: "admin" })),
      "/connexion?erreur=lien-invalide",
    );
    expect(supabase!.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("mène à la réinitialisation après un lien de récupération", async () => {
    await expectRedirect(
      verifyEmailLinkAction(formData({ token_hash: "abc", type: "recovery", next: "https://x" })),
      "/reinitialiser-mot-de-passe",
    );
    expect(supabase!.auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
  });

  it("signale un lien expiré", async () => {
    supabase!.auth.verifyOtp.mockResolvedValueOnce({
      data: {},
      error: { code: "otp_expired", status: 403 },
    } as never);
    await expectRedirect(
      verifyEmailLinkAction(formData({ token_hash: "abc", type: "email" })),
      "/connexion?erreur=lien-invalide",
    );
  });
});

describe("signInWithGoogleAction", () => {
  it("redirige vers Google avec un retour interne", async () => {
    await expectRedirect(
      signInWithGoogleAction(formData({ next: "/vendre" })),
      "https://accounts.google.com/o/oauth2",
    );
    expect(supabase!.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fvendre" },
    });
  });
});
