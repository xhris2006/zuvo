import { z } from "zod";
import { citySlugs } from "@/config/locations";
import { displayNameSchema, usernameSchema } from "@/features/auth/schemas";
import { normalizePhone } from "./phone";

export const BIO_MAX_LENGTH = 500;
const AVATAR_FILE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/;

/** Champs publics modifiables d'un profil (mêmes règles que les contraintes SQL). */
export const profileSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_LENGTH, `${BIO_MAX_LENGTH} caractères au maximum.`)
    .transform((value) => value || null),
  city: z
    .union([z.literal(""), z.enum(citySlugs, { error: "Ville invalide." })])
    .transform((value) => value || null),
  /** Chemin du nouvel avatar ("" = aucun changement, "-" = supprimer la photo). */
  avatarPath: z.string().max(200),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Vérifie qu'un chemin d'avatar appartient bien au dossier de l'utilisateur. */
export function isOwnAvatarPath(userId: string, path: string): boolean {
  const [folder, file, ...rest] = path.split("/");
  return folder === userId && rest.length === 0 && file !== undefined && AVATAR_FILE.test(file);
}

export const privateContactSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((value, context) => {
      if (!value) return null;
      const normalized = normalizePhone(value);
      if (!normalized) {
        context.addIssue({
          code: "custom",
          message: "Numéro invalide. Exemple : 6 90 00 00 00 ou +237 6 90 00 00 00.",
        });
        return z.NEVER;
      }
      return normalized;
    }),
});
