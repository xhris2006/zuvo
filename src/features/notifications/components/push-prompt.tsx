"use client";

import { BellRing, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePushDevice } from "../use-push-device";
import { useT } from "@/i18n/client";

const DISMISS_KEY = "zuvo:push-prompt-dismissed";

/**
 * Bandeau invitant à activer les notifications sur cet appareil (messagerie,
 * notifications). Masqué si elles sont déjà actives, indisponibles ou si
 * l'utilisateur l'a fermé.
 */
export function PushPrompt({ context }: { context: "messages" | "notifications" }) {
  const t = useT();
  const { status, busy, enable } = usePushDevice();
  // Rien n'est affiché avant la détection de l'appareil (côté client) : lire
  // le stockage local dès l'initialisation ne crée pas d'écart d'hydratation.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  if (dismissed || status !== "off") return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée) : le bandeau reviendra.
    }
  }

  return (
    <section
      aria-label={t.push.promptLabel}
      className="relative flex items-start gap-3 rounded-2xl border border-secondary bg-accent p-4 pr-10"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <BellRing className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm font-semibold">{t.push.promptTitle}</p>
        <p className="text-sm text-muted-foreground">
          {context === "messages" ? t.push.promptMessages : t.push.promptNotifications}
        </p>
        <Button
          size="sm"
          className="self-start"
          loading={busy}
          onClick={async () => setError(await enable())}
        >
          {t.push.promptEnable}
        </Button>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        aria-label={t.push.hide}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
