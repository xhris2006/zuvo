import { z } from "zod";
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
  .min(1, "Indiquez votre adresse e-mail.")
  .max(254, "Adresse e-mail trop longue.")
  .pipe(z.email("Adresse e-mail invalide."));

/** Mot de passe d'un nouveau compte ou d'une réinitialisation. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(PASSWORD_MAX_LENGTH, `${PASSWORD_MAX_LENGTH} caractères au maximum.`)
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre.");

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(3, "Au moins 3 caractères.")
      .max(30, "30 caractères au maximum.")
      .regex(USERNAME_PATTERN, "Lettres minuscules, chiffres et _ uniquement.")
      .refine((value) => !isReservedUsername(value), "Ce nom d'utilisateur est réservé."),
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Indiquez votre nom.")
  .max(50, "50 caractères au maximum.");

export const signInSchema = z.object({
  email: emailSchema,
  // Aucune règle de complexité à la connexion : ne rien révéler de la politique.
  password: z.string().min(1, "Indiquez votre mot de passe.").max(PASSWORD_MAX_LENGTH),
});

export const signUpSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.literal("on", {
    error: "Vous devez accepter les conditions d'utilisation.",
  }),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
