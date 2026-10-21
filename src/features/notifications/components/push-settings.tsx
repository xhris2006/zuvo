"use client";

import { BellOff, BellRing, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { formatRelativeTime } from "@/lib/format";
import { sendTestPushAction } from "../actions";
import type { LastPushResult } from "../queries";
import { usePushDevice } from "../use-push-device";

const lastPushLabels: Record<string, string> = {
  sent: "envoyée à vos appareils",
  no_device: "aucun appareil n'était activé à ce moment-là",
  disabled: "les notifications push étaient désactivées",
  failed: "refusée par le service de notifications : désactivez puis réactivez ci-dessous",
  skipped: "non envoyée (déjà lue)",
};

type Feedback = { variant: "success" | "danger"; text: string } | null;

type PushSettingsProps = {
  /** Dernière notification traitée par l'envoi push (diagnostic). */
  lastPush?: LastPushResult | null;
  /** L'administrateur voit où terminer la configuration. */
  isAdmin?: boolean;
};

/** Activation des notifications push sur cet appareil (page Paramètres). */
export function PushSettings({ lastPush = null, isAdmin = false }: PushSettingsProps) {
  const { status, busy, enable: enableDevice, disable: disableDevice } = usePushDevice();
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function enable() {
    setFeedback(null);
    const error = await enableDevice();
    setFeedback(
      error
        ? { variant: "danger", text: error }
        : { variant: "success", text: "Notifications activées sur cet appareil." },
    );
  }

  async function disable() {
    setFeedback(null);
    await disableDevice();
    setFeedback({ variant: "success", text: "Notifications désactivées sur cet appareil." });
  }

  async function test() {
    setTesting(true);
    setFeedback(null);
    const result = await sendTestPushAction();
    setTesting(false);
    setFeedback(
      result.status === "ok"
        ? {
            variant: "success",
            text: "Notification de test envoyée : elle doit apparaître dans quelques secondes.",
          }
        : { variant: "danger", text: result.message },
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={status === "checking"}>
      {status === "checking" ? (
        <p className="text-sm text-muted-foreground">Vérification de cet appareil…</p>
      ) : null}
      {status === "not_configured" ? (
        isAdmin ? (
          <Alert variant="warning" title="Configuration incomplète">
            La clé publique VAPID n&apos;est pas présente dans ce déploiement. Suivez les étapes de{" "}
            <Link href={routes.adminConfig} className="font-semibold underline">
              Administration → Configuration
            </Link>{" "}
            puis redéployez le site.
          </Alert>
        ) : (
          <Alert variant="info" title="Bientôt disponible">
            Les notifications push ne sont pas encore activées sur {siteConfig.name}. Vous retrouvez
            toutes vos notifications sur la page Notifications.
          </Alert>
        )
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
          {lastPush ? (
            <p className="text-sm text-muted-foreground">
              Dernière notification : {formatRelativeTime(lastPush.pushedAt)},{" "}
              {(lastPush.status && lastPushLabels[lastPush.status]) ?? "résultat inconnu"}
              {lastPush.status === "failed" && lastPush.detail ? ` (${lastPush.detail})` : ""}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void test()} loading={testing} disabled={busy}>
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
