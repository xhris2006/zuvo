"use client";

import { BellRing, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { notifyPushAttentionChange, PUSH_PROMPT_DISMISS_KEY } from "../push-attention";
import { usePushDevice } from "../use-push-device";
import { useT } from "@/i18n/client";

/**
 * Bandeau invitant à activer les notifications sur cet appareil (page
 * Notifications) : l'icône pulse pour attirer l'attention. Masqué si elles
 * sont déjà actives, indisponibles ou si l'utilisateur l'a fermé ; la cloche
 * cesse alors de clignoter.
 */
export function PushPrompt({ context }: { context: "messages" | "notifications" }) {
  const t = useT();
  const { status, busy, enable } = usePushDevice();
  // Rien n'est affiché avant la détection de l'appareil (côté client) : lire
  // le stockage local dès l'initialisation ne crée pas d'écart d'hydratation.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PUSH_PROMPT_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  if (dismissed || status !== "off") return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée) : le bandeau reviendra.
    }
    notifyPushAttentionChange();
  }

  return (
    <section
      aria-label={t.push.promptLabel}
      className="relative flex items-start gap-3 rounded-2xl border border-primary-line/40 bg-accent p-4 pr-10 shadow-[0_0_0_4px_rgb(255_122_0/0.08)]"
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-primary opacity-60 motion-safe:animate-ping"
        />
        <BellRing
          className="relative size-5 motion-safe:animate-[bell-ring_2.4s_ease-in-out_infinite]"
          aria-hidden="true"
        />
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
          onClick={async () => {
            setError(await enable());
            notifyPushAttentionChange();
          }}
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
