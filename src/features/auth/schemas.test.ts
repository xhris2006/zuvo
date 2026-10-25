import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { translateValidation } from "@/lib/forms/validation";
import { getServerDictionary } from "@/i18n/server-dictionaries";
import { authErrorMessage, callbackErrorMessage } from "./errors";
import { resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

/** Message de validation traduit en français (les schémas produisent des codes). */
const text = (message?: string) =>
  message === undefined ? undefined : translateValidation(message, getDictionary("fr").validation);

const validSignUp = {
  username: " @Awa_237 ",
  displayName: " Awa ",
  email: " Awa@Example.CM ",
  password: "motdepasse1",
  acceptTerms: "on",
};

describe("signUpSchema", () => {
  it("normalise les champs valides", () => {
    expect(signUpSchema.parse(validSignUp)).toEqual({
      username: "awa_237",
      displayName: "Awa",
      email: "awa@example.cm",
      password: "motdepasse1",
      acceptTerms: "on",
    });
  });

  it.each([
    ["password", "court1", "Au moins 8 caractères."],
    ["password", "seulementdeslettres", "Le mot de passe doit contenir au moins un chiffre."],
    ["password", "123456789", "Le mot de passe doit contenir au moins une lettre."],
    ["username", "ab", "Au moins 3 caractères."],
    ["username", "awa.237", "Lettres minuscules, chiffres et _ uniquement."],
    ["username", "admin", "Ce nom d'utilisateur est réservé."],
    ["email", "pas-un-email", "Adresse e-mail invalide."],
    ["displayName", "   ", "Indiquez votre nom."],
  ])("refuse %s = %j", (field, value, message) => {
    const result = signUpSchema.safeParse({ ...validSignUp, [field]: value });
    expect(result.success).toBe(false);
    expect(text(result.error?.issues.find((issue) => issue.path[0] === field)?.message)).toBe(
      message,
    );
  });

  it("exige l'acceptation des conditions", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, acceptTerms: undefined });
    expect(text(result.error?.issues[0]?.message)).toBe(
      "Vous devez accepter les conditions d'utilisation.",
    );
  });
});

describe("signInSchema", () => {
  it("n'impose pas la politique de mot de passe à la connexion", () => {
    expect(signInSchema.safeParse({ email: "a@b.cm", password: "x" }).success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("exige deux mots de passe identiques", () => {
    const result = resetPasswordSchema.safeParse({
      password: "motdepasse1",
      confirmPassword: "motdepasse2",
    });
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("messages d'erreur", () => {
  it("traduisent les codes connus et masquent les autres", () => {
    const texts = getServerDictionary("fr").authErrors;
    expect(authErrorMessage(texts, { code: "invalid_credentials" })).toBe(
      "E-mail ou mot de passe incorrect.",
    );
    expect(authErrorMessage(texts, { code: "unexpected_failure" })).toBe(texts.generic);
    expect(authErrorMessage(texts, { code: "toString" })).toBe(texts.generic);
    expect(authErrorMessage(texts, { status: 429 })).toMatch(/Trop de tentatives/);
    expect(authErrorMessage(getServerDictionary("en").authErrors, { status: 429 })).toMatch(
      /Too many attempts/,
    );
  });

  it("n'acceptent que les codes de rappel connus", () => {
    const texts = getServerDictionary("fr").authErrors;
    expect(callbackErrorMessage(texts, "lien-invalide")).toMatch(/invalide/);
    expect(callbackErrorMessage(texts, "<script>")).toBeNull();
    expect(callbackErrorMessage(texts, "toString")).toBeNull();
  });
});
