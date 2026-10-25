import { z } from "zod";
import { vm } from "@/lib/forms/validation";

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
      .min(3, vm("subjectMin", 3))
      .max(SUBJECT_MAX, vm("maxChars", SUBJECT_MAX)),
    message: z
      .string()
      .trim()
      .min(10, vm("requestMin", 10))
      .max(MESSAGE_MAX, vm("maxChars", MESSAGE_MAX)),
  })
  .refine((value) => value.kind === "contact" || value.listingId !== null, {
    path: ["listingId"],
    message: vm("appealListingMissing"),
  });

export type SupportField = "subject" | "message" | "listingId";

export const supportStatuses = ["open", "answered", "closed"] as const;
export type SupportStatus = (typeof supportStatuses)[number];
