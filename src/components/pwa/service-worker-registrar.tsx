"use client";

import { useEffect } from "react";
import { SERVICE_WORKER_URL } from "@/features/notifications/push-client";

/** Enregistre le service worker en production (notifications push). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: "/", updateViaCache: "none" })
      .catch(() => undefined);
  }, []);
  return null;
}
