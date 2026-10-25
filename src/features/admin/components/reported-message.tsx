"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { type ReportedMessage as Message, viewReportedMessageAction } from "../actions";

/** Message signalé, affiché à la demande (chaque consultation est journalisée). */
export function ReportedMessage({ reportId }: { reportId: string }) {
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loaded"; message: Message | null } | { kind: "error"; text: string }
  >({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const t = useT();

  if (state.kind === "loaded") {
    return state.message ? (
      <blockquote className="rounded-lg border-l-4 border-danger bg-muted px-3 py-2 text-sm">
        {state.message.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- photo privée (lien signé de 5 minutes)
          <img
            src={state.message.photoUrl}
            alt={t.adminUi.reportedMessage.photoAlt}
            className="mb-2 max-h-64 rounded-md object-contain"
          />
        ) : null}
        {state.message.body ? (
          <p className="break-words whitespace-pre-wrap">{state.message.body}</p>
        ) : state.message.photoUrl ? null : (
          <p className="text-muted-foreground">{t.adminUi.reportedMessage.photoUnavailable}</p>
        )}
        <footer className="mt-1 text-xs text-muted-foreground">
          @{state.message.senderUsername ?? t.adminUi.reportedMessage.deletedAccount} ·{" "}
          {t.format.date(state.message.createdAt)}
        </footer>
      </blockquote>
    ) : (
      <p className="text-sm text-muted-foreground">{t.adminUi.reportedMessage.deleted}</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          const result = await viewReportedMessageAction(reportId);
          setLoading(false);
          setState(
            result.status === "ok"
              ? { kind: "loaded", message: result.message }
              : { kind: "error", text: result.message },
          );
        }}
      >
        <Eye aria-hidden="true" />
        {t.adminUi.reportedMessage.show}
      </Button>
      <p className="text-xs text-muted-foreground">{t.adminUi.reportedMessage.privacyNote}</p>
      {state.kind === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {state.text}
        </p>
      ) : null}
    </div>
  );
}
