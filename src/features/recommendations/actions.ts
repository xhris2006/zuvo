"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/session";
import { getT } from "@/i18n/server";
import type { FormState } from "@/lib/forms/form-state";
import { clearListingViews } from "./queries";

/** Efface l'historique de consultation (Paramètres → Recommandations). */
export async function clearViewHistoryAction(): Promise<FormState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: t.authErrors.sessionExpired };
  if (!(await clearListingViews(user.id))) {
    return { status: "error", message: t.recommendationActions.failed };
  }
  revalidatePath("/", "layout");
  return { status: "success", message: t.recommendationActions.cleared };
}
