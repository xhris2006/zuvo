"use client";

import { useCallback, useEffect, useState } from "react";
import { publicEnv } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "./actions";
import {
  getCurrentPushSubscription,
  isIosOutsideHomeScreen,
  isPushSupported,
  subscribeToPush,
  usesServerKey,
} from "./push-client";

export type PushDeviceStatus =
  "checking" | "not_configured" | "unsupported" | "ios_install" | "denied" | "off" | "on";

/** Appareil abonné pour ce compte, avec les clés actuelles du serveur. */
async function isRegisteredForUser(subscription: PushSubscription): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Appareil activé pour ce compte mais abonné avec d'anciennes clés VAPID
 * (clés régénérées depuis) : le service push refuserait tout envoi. Un nouvel
 * abonnement est créé sans redemander l'autorisation, déjà accordée.
 */
export async function repairStaleSubscription(publicKey: string): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const subscription = await getCurrentPushSubscription();
  if (!subscription || usesServerKey(subscription, publicKey)) return false;
  if (!(await isRegisteredForUser(subscription))) return false;
  const staleEndpoint = subscription.endpoint;
  const fresh = await subscribeToPush(publicKey);
  const result = await savePushSubscriptionAction(fresh.toJSON());
  if (result.status === "error") return false;
  if (fresh.endpoint !== staleEndpoint) await removePushSubscriptionAction(staleEndpoint);
  return true;
}

async function detectStatus(publicKey: string | undefined): Promise<PushDeviceStatus> {
  if (!publicKey) return "not_configured";
  if (!isPushSupported()) return isIosOutsideHomeScreen() ? "ios_install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (await repairStaleSubscription(publicKey).catch(() => false)) return "on";
  const subscription = await getCurrentPushSubscription();
  if (!subscription || !usesServerKey(subscription, publicKey)) return "off";
  return (await isRegisteredForUser(subscription)) ? "on" : "off";
}

/**
 * État des notifications push sur cet appareil et actions associées.
 * L'autorisation du navigateur n'est demandée qu'au clic, jamais au chargement.
 */
export function usePushDevice() {
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<PushDeviceStatus>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    detectStatus(publicKey)
      .then((next) => active && setStatus(next))
      .catch(() => active && setStatus("off"));
    return () => {
      active = false;
    };
  }, [publicKey]);

  /** Renvoie un message d'erreur, ou null si tout s'est bien passé. */
  const enable = useCallback(async (): Promise<string | null> => {
    if (!publicKey) return "Les notifications push ne sont pas encore disponibles.";
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return permission === "denied"
          ? "Notifications refusées : autorisez-les dans les réglages du navigateur."
          : "Autorisation non accordée.";
      }
      const subscription = await subscribeToPush(publicKey);
      const result = await savePushSubscriptionAction(subscription.toJSON());
      if (result.status === "error") return result.message;
      setStatus("on");
      return null;
    } catch {
      return "Votre navigateur n'a pas pu activer les notifications. Réessayez plus tard.";
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe().catch(() => false);
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}
