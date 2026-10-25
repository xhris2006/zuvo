import { z } from "zod";
import { vm } from "@/lib/forms/validation";
import {
  isReservedUsername,
  normalizeUsername,
  USERNAME_PATTERN,
} from "@/features/profiles/username";

export const PASSWORD_MIN_LENGTH = 8;
/** Limite de bcrypt utilisée par Supabase Auth. */
export const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, vm("emailRequired"))
  .max(254, vm("emailTooLong"))
  .pipe(z.email(vm("emailInvalid")));

/** Mot de passe d'un nouveau compte ou d'une réinitialisation. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, vm("minChars", PASSWORD_MIN_LENGTH))
  .max(PASSWORD_MAX_LENGTH, vm("maxChars", PASSWORD_MAX_LENGTH))
  .regex(/[A-Za-z]/, vm("passwordLetter"))
  .regex(/\d/, vm("passwordDigit"));

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(3, vm("minChars", 3))
      .max(30, vm("maxChars", 30))
      .regex(USERNAME_PATTERN, vm("usernamePattern"))
      .refine((value) => !isReservedUsername(value), vm("usernameReserved")),
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, vm("nameRequired"))
  .max(50, vm("maxChars", 50));

export const signInSchema = z.object({
  email: emailSchema,
  // Aucune règle de complexité à la connexion : ne rien révéler de la politique.
  password: z.string().min(1, vm("passwordRequired")).max(PASSWORD_MAX_LENGTH),
});

export const signUpSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.literal("on", {
    error: vm("termsRequired"),
  }),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: vm("passwordMismatch"),
    path: ["confirmPassword"],
  });
