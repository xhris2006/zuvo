"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { pushNeedsAttention, subscribePushAttention } from "../push-attention";

/**
 * Point orange qui pulse sur la cloche tant que les notifications n'ont pas
 * été activées sur cet appareil (sans animation si l'utilisateur la réduit).
 */
export function PushAttentionDot({ className }: { className?: string }) {
  const t = useT();
  const needed = useSyncExternalStore(subscribePushAttention, pushNeedsAttention, () => false);
  if (!needed) return null;
  return (
    <>
      <span className="sr-only">{`, ${t.push.attention}`}</span>
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute flex size-2.5", className)}
      >
        <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary ring-2 ring-background" />
      </span>
    </>
  );
}
