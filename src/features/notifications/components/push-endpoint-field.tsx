"use client";

import { useEffect, useState } from "react";
import { getCurrentPushSubscription } from "../push-client";

/**
 * Champ caché du formulaire de déconnexion : l'abonnement push de cet
 * appareil est retiré du compte afin qu'un navigateur partagé ne reçoive plus
 * ses notifications.
 */
export function PushEndpointField() {
  const [endpoint, setEndpoint] = useState("");
  useEffect(() => {
    getCurrentPushSubscription()
      .then((subscription) => setEndpoint(subscription?.endpoint ?? ""))
      .catch(() => undefined);
  }, []);
  return <input type="hidden" name="pushEndpoint" value={endpoint} />;
}
