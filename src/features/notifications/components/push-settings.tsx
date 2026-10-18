"use client";

import { BellOff, BellRing, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "../actions";
import {
  getCurrentPushSubscription,
  isIosOutsideHomeScreen,
  isPushSupported,
  subscribeToPush,
} from "../push-client";

type Status =
  "checking" | "not_configured" | "unsupported" | "ios_install" | "denied" | "off" | "on";

type Feedback = { variant: "success" | "danger"; text: string } | null;

/** Appareil abonné au push pour ce compte (l'abonnement du navigateur seul ne suffit pas). */
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

async function detectStatus(publicKey: string | undefined): Promise<Status> {
  if (!publicKey) return "not_configured";
  if (!isPushSupported()) return isIosOutsideHomeScreen() ? "ios_install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const subscription = await getCurrentPushSubscription();
  return subscription && (await isRegisteredForUser(subscription)) ? "on" : "off";
}

/**
 * Activation des notifications push sur cet appareil. L'autorisation du
 * navigateur n'est demandée qu'au clic, jamais au chargement de la page.
 */
export function PushSettings() {
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let active = true;
    detectStatus(publicKey)
      .then((next) => active && setStatus(next))
      .catch(() => active && setStatus("off"));
    return () => {
      active = false;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setFeedback(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const subscription = await subscribeToPush(publicKey);
      const result = await savePushSubscriptionAction(subscription.toJSON());
      if (result.status === "error") {
        setFeedback({ variant: "danger", text: result.message });
        return;
      }
      setStatus("on");
      setFeedback({ variant: "success", text: "Notifications activées sur cet appareil." });
    } catch {
      setFeedback({
        variant: "danger",
        text: "Votre navigateur n'a pas pu activer les notifications. Réessayez plus tard.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setFeedback(null);
    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe().catch(() => false);
      }
      setStatus("off");
      setFeedback({ variant: "success", text: "Notifications désactivées sur cet appareil." });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setFeedback(null);
    const result = await sendTestPushAction();
    setBusy(false);
    setFeedback(
      result.status === "ok"
        ? { variant: "success", text: "Notification de test envoyée." }
        : { variant: "danger", text: result.message },
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={status === "checking"}>
      {status === "checking" ? (
        <p className="text-sm text-muted-foreground">Vérification de cet appareil…</p>
      ) : null}
      {status === "not_configured" ? (
        <Alert variant="info" title="Bientôt disponible">
          Les notifications push ne sont pas encore activées sur {siteConfig.name}. Vous retrouvez
          toutes vos notifications sur la page Notifications.
        </Alert>
      ) : null}
      {status === "unsupported" ? (
        <Alert variant="warning" title="Navigateur non compatible">
          Ce navigateur ne prend pas en charge les notifications push. Essayez avec une version
          récente de Chrome, Firefox, Edge ou Safari.
        </Alert>
      ) : null}
      {status === "ios_install" ? (
        <Alert variant="info" title="Sur iPhone et iPad">
          Ajoutez d&apos;abord le site à votre écran d&apos;accueil (bouton Partager, puis « Sur
          l&apos;écran d&apos;accueil »), ouvrez-le depuis l&apos;icône, puis revenez ici. iOS 16.4
          ou plus récent est nécessaire.
        </Alert>
      ) : null}
      {status === "denied" ? (
        <Alert variant="warning" title="Notifications bloquées">
          Vous avez refusé les notifications pour ce site. Autorisez-les dans les réglages de votre
          navigateur, puis rechargez la page.
        </Alert>
      ) : null}

      {status === "off" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Recevez une alerte sur cet appareil pour les nouveaux messages et l&apos;activité de vos
            annonces, même quand le site est fermé.
          </p>
          <Button onClick={() => void enable()} loading={busy} className="shrink-0">
            <BellRing aria-hidden="true" />
            Activer
          </Button>
        </div>
      ) : null}

      {status === "on" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-success">
            Notifications push activées sur cet appareil.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void test()} disabled={busy}>
              <Send aria-hidden="true" />
              Envoyer un test
            </Button>
            <Button variant="ghost" onClick={() => void disable()} disabled={busy}>
              <BellOff aria-hidden="true" />
              Désactiver sur cet appareil
            </Button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p
          role={feedback.variant === "danger" ? "alert" : "status"}
          className={feedback.variant === "danger" ? "text-sm text-danger" : "text-sm text-success"}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
