"use client";

import { useEffect } from "react";
import { publicEnv } from "@/lib/env";
import { repairStaleSubscription } from "../use-push-device";

/** Renouvelle en arrière-plan un abonnement push devenu invalide (membres connectés). */
export function PushSync() {
  useEffect(() => {
    const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (publicKey) void repairStaleSubscription(publicKey).catch(() => false);
  }, []);
  return null;
}
