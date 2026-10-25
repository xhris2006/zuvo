import { z } from "zod";

export const SUBJECT_MAX = 120;
export const MESSAGE_MAX = 2000;

export const supportRequestSchema = z
  .object({
    kind: z.enum(["contact", "appeal"]),
    listingId: z
      .string()
      .transform((value) => value || null)
      .pipe(z.uuid().nullable()),
    subject: z
      .string()
      .trim()
      .min(3, "Indiquez un objet d'au moins 3 caractères.")
      .max(SUBJECT_MAX, `${SUBJECT_MAX} caractères au maximum.`),
    message: z
      .string()
      .trim()
      .min(10, "Décrivez votre demande en au moins 10 caractères.")
      .max(MESSAGE_MAX, `${MESSAGE_MAX} caractères au maximum.`),
  })
  .refine((value) => value.kind === "contact" || value.listingId !== null, {
    path: ["listingId"],
    message: "Annonce à contester introuvable.",
  });

export type SupportField = "subject" | "message" | "listingId";

export const supportStatuses = ["open", "answered", "closed"] as const;
export type SupportStatus = (typeof supportStatuses)[number];
