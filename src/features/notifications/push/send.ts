import "server-only";
import webpush, { WebPushError } from "web-push";
import { publicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/server-env";
import { isAllowedPushEndpoint } from "../push-endpoint";

export type PushConfig = { publicKey: string; privateKey: string; subject: string };

/** Clés VAPID complètes, ou null tant que le push n'est pas configuré. */
export function getPushConfig(): PushConfig | null {
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const { VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = getServerEnv();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export type PushPayload = {
  title: string;
  body: string;
  /** Chemin relatif ouvert au clic (même origine uniquement). */
  url: string;
  /** Regroupe les notifications d'un même sujet (ex. une conversation). */
  tag: string;
};

export type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };

export type SendResult = { sent: string[]; expired: string[]; failed: number };

/**
 * Envoie la même charge utile à plusieurs abonnements. Les abonnements
 * expirés (404/410) sont signalés pour être supprimés ; les autres erreurs
 * sont comptées sans être journalisées en détail (l'URL contient un jeton).
 */
export async function sendPush(
  subscriptions: StoredSubscription[],
  payload: PushPayload,
  config: PushConfig,
): Promise<SendResult> {
  const result: SendResult = { sent: [], expired: [], failed: 0 };
  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (subscription) => {
      // Défense en profondeur : aucune requête hors des services push connus.
      if (!isAllowedPushEndpoint(subscription.endpoint)) {
        result.expired.push(subscription.id);
        return;
      }
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          {
            vapidDetails: config,
            TTL: 12 * 60 * 60,
            urgency: "normal",
            timeout: 10_000,
          },
        );
        result.sent.push(subscription.id);
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          result.expired.push(subscription.id);
        } else {
          result.failed += 1;
        }
      }
    }),
  );
  return result;
}
