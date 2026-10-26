"use client";

import { BellOff, BellRing, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { sendTestPushAction } from "../actions";
import type { LastPushResult } from "../queries";
import { usePushDevice } from "../use-push-device";
import { useT } from "@/i18n/client";

type Feedback = { variant: "success" | "danger"; text: string } | null;

type PushSettingsProps = {
  /** Dernière notification traitée par l'envoi push (diagnostic). */
  lastPush?: LastPushResult | null;
  /** L'administrateur voit où terminer la configuration. */
  isAdmin?: boolean;
};

/** Activation des notifications push sur cet appareil (page Paramètres). */
export function PushSettings({ lastPush = null, isAdmin = false }: PushSettingsProps) {
  const t = useT();
  const { status, busy, enable: enableDevice, disable: disableDevice } = usePushDevice();
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function enable() {
    setFeedback(null);
    const error = await enableDevice();
    setFeedback(
      error ? { variant: "danger", text: error } : { variant: "success", text: t.push.enabled },
    );
  }

  async function disable() {
    setFeedback(null);
    await disableDevice();
    setFeedback({ variant: "success", text: t.push.disabled });
  }

  async function test() {
    setTesting(true);
    setFeedback(null);
    const result = await sendTestPushAction();
    setTesting(false);
    setFeedback(
      result.status === "ok"
        ? { variant: "success", text: t.push.testSent }
        : { variant: "danger", text: result.message },
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={status === "checking"}>
      {status === "checking" ? (
        <p className="text-sm text-muted-foreground">{t.push.checking}</p>
      ) : null}
      {status === "not_configured" ? (
        isAdmin ? (
          <Alert variant="warning" title={t.push.incompleteTitle}>
            {t.push.incompleteBefore}{" "}
            <Link href={routes.adminConfig} className="font-semibold underline">
              {t.push.incompleteLink}
            </Link>{" "}
            {t.push.incompleteAfter}
          </Alert>
        ) : (
          <Alert variant="info" title={t.push.soonTitle}>
            {t.push.soonBody(siteConfig.name)}
          </Alert>
        )
      ) : null}
      {status === "unsupported" ? (
        <Alert variant="warning" title={t.push.unsupportedTitle}>
          {t.push.unsupportedBody}
        </Alert>
      ) : null}
      {status === "ios_install" ? (
        <Alert variant="info" title={t.push.iosTitle}>
          {t.push.iosBody}{" "}
          <Link href={routes.install} className="font-medium underline underline-offset-2">
            {t.push.iosGuide}
          </Link>
        </Alert>
      ) : null}
      {status === "denied" ? (
        <Alert variant="warning" title={t.push.deniedTitle}>
          {t.push.deniedBody}
        </Alert>
      ) : null}

      {status === "off" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t.push.offBody}</p>
          <Button onClick={() => void enable()} loading={busy} className="shrink-0">
            <BellRing aria-hidden="true" />
            {t.push.enable}
          </Button>
        </div>
      ) : null}

      {status === "on" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-success">{t.push.onBody}</p>
          {lastPush ? (
            <p className="text-sm text-muted-foreground">
              {t.push.lastPush(
                t.format.relativeTime(lastPush.pushedAt),
                (lastPush.status && t.push.lastPushLabels[lastPush.status]) ?? t.push.unknownResult,
              )}
              {lastPush.status === "failed" && lastPush.detail ? ` (${lastPush.detail})` : ""}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void test()} loading={testing} disabled={busy}>
              <Send aria-hidden="true" />
              {t.push.sendTest}
            </Button>
            <Button variant="ghost" onClick={() => void disable()} disabled={busy}>
              <BellOff aria-hidden="true" />
              {t.push.disableHere}
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
