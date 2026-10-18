import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { dispatchNotification } from "@/features/notifications/push/dispatch";
import { getPushConfig } from "@/features/notifications/push/send";
import { getServerEnv } from "@/lib/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook de base de données Supabase (insertion dans `notifications`) :
 * envoie la notification push correspondante. Protégé par un secret partagé
 * transmis dans l'en-tête Authorization (voir docs/notifications.md).
 */
const webhookSchema = z.object({
  type: z.literal("INSERT"),
  schema: z.literal("public"),
  table: z.literal("notifications"),
  record: z.object({ id: z.uuid() }),
});

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Comparaison à temps constant (empreintes de longueur fixe). */
function isAuthorized(header: string | null, secret: string): boolean {
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return provided.length > 0 && timingSafeEqual(digest(provided), digest(secret));
}

export async function POST(request: Request) {
  const secret = getServerEnv().PUSH_WEBHOOK_SECRET;
  const config = getPushConfig();
  const admin = createSupabaseAdminClient();
  if (!secret || !config || !admin) return json({ error: "push_not_configured" }, 503);

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return json({ error: "unauthorized" }, 401);
  }

  const payload = webhookSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return json({ error: "invalid_payload" }, 400);

  try {
    const outcome = await dispatchNotification(admin, payload.data.record.id, config);
    return json(outcome, 200);
  } catch {
    return json({ error: "dispatch_failed" }, 500);
  }
}
