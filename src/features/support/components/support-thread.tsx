import { Headset } from "lucide-react";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import type { SupportThreadMessage } from "../queries";

/**
 * Bulles d'une conversation d'assistance. `viewer` fixe le côté de chacun :
 * ses propres messages à droite, ceux de l'autre partie à gauche.
 */
export async function SupportThreadMessages({
  messages,
  viewer,
  memberName,
}: {
  messages: SupportThreadMessage[];
  viewer: "member" | "staff";
  /** Nom affiché pour le membre côté équipe. */
  memberName?: string;
}) {
  const t = await getT();
  const copy = t.supportPage;
  return (
    <ol aria-label={copy.log} className="flex flex-col gap-3">
      {messages.map((message) => {
        const mine = viewer === "staff" ? message.fromStaff : !message.fromStaff;
        const author = message.fromStaff
          ? copy.team
          : viewer === "member"
            ? copy.you
            : (memberName ?? copy.you);
        return (
          <li
            key={message.id}
            className={cn(
              "flex max-w-[85%] gap-2 sm:max-w-[75%]",
              mine && "flex-row-reverse self-end",
            )}
          >
            {message.fromStaff ? (
              <span className="mt-5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Headset className="size-4" aria-hidden="true" />
              </span>
            ) : null}
            <div className={cn("flex min-w-0 flex-col gap-1", mine && "items-end")}>
              <p className="px-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{author}</span>
                {" · "}
                <time dateTime={message.createdAt}>{t.format.dateTime(message.createdAt)}</time>
              </p>
              <p
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-line",
                  mine
                    ? "rounded-tr-md bg-primary text-primary-foreground"
                    : "rounded-tl-md border border-border bg-card text-foreground",
                )}
              >
                {message.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
