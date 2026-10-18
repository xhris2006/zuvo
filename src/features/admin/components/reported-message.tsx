"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { type ReportedMessage as Message, viewReportedMessageAction } from "../actions";

/** Message signalé, affiché à la demande (chaque consultation est journalisée). */
export function ReportedMessage({ reportId }: { reportId: string }) {
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loaded"; message: Message | null } | { kind: "error"; text: string }
  >({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  if (state.kind === "loaded") {
    return state.message ? (
      <blockquote className="rounded-lg border-l-4 border-danger bg-muted px-3 py-2 text-sm">
        <p className="break-words whitespace-pre-wrap">{state.message.body ?? "(pièce jointe)"}</p>
        <footer className="mt-1 text-xs text-muted-foreground">
          @{state.message.senderUsername ?? "compte supprimé"} ·{" "}
          {formatDate(state.message.createdAt)}
        </footer>
      </blockquote>
    ) : (
      <p className="text-sm text-muted-foreground">Ce message a été supprimé.</p>
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
        Afficher le message
      </Button>
      <p className="text-xs text-muted-foreground">
        Les messages sont privés : chaque consultation est enregistrée dans le journal.
      </p>
      {state.kind === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {state.text}
        </p>
      ) : null}
    </div>
  );
}
