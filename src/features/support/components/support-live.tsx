"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Recharge la conversation dès qu'un nouveau message y est ajouté (temps réel
 * Supabase, filtré par RLS : seuls l'auteur de la demande et l'équipe le reçoivent).
 */
export function SupportLive({ requestId }: { requestId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`support:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 300);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [requestId, router]);
  return null;
}
