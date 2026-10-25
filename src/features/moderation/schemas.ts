import { z } from "zod";
import { vm } from "@/lib/forms/validation";
import { Constants } from "@/lib/supabase/database.types";

export const REPORT_DETAILS_MAX = 1000;

export type ReportTargetType = (typeof Constants.public.Enums.report_target_type)[number];
export type ReportReason = (typeof Constants.public.Enums.report_reason)[number];
export type ReportStatus = (typeof Constants.public.Enums.report_status)[number];

/** Motifs proposés selon ce qui est signalé. */
export const reasonsByTarget: Record<ReportTargetType, ReportReason[]> = {
  listing: ["scam", "prohibited_item", "counterfeit", "inappropriate", "spam", "other"],
  user: ["scam", "harassment", "fake_account", "inappropriate", "spam", "other"],
  message: ["harassment", "scam", "spam", "inappropriate", "other"],
};

export const reportSchema = z
  .object({
    targetType: z.enum(Constants.public.Enums.report_target_type),
    targetId: z.uuid(vm("itemNotFound")),
    reason: z.enum(Constants.public.Enums.report_reason, vm("reasonRequired")),
    details: z
      .string()
      .trim()
      .max(REPORT_DETAILS_MAX, vm("maxChars", REPORT_DETAILS_MAX))
      .transform((value) => value || null),
  })
  .refine((value) => reasonsByTarget[value.targetType].includes(value.reason), {
    path: ["reason"],
    message: vm("reasonRequired"),
  })
  .refine((value) => value.reason !== "other" || value.details, {
    path: ["details"],
    message: vm("reportDetailsRequired"),
  });
