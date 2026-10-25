"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";

export type UnreadCounts = { messages: number; notifications: number };

const NO_COUNTS: UnreadCounts = { messages: 0, notifications: 0 };

const UnreadCountsContext = createContext<UnreadCounts>(NO_COUNTS);

export function useUnreadCounts(): UnreadCounts {
  return useContext(UnreadCountsContext);
}

type UnreadCountsProviderProps = {
  /** Utilisateur connecté ; null : aucun compteur ni abonnement temps réel. */
  userId: string | null;
  initial: UnreadCounts;
  children: ReactNode;
};

/**
 * Compteurs de messages et notifications non lus. Valeurs initiales calculées
 * côté serveur, puis rafraîchies à chaque navigation et à chaque changement
 * diffusé par Supabase Realtime (filtré par RLS).
 */
export function UnreadCountsProvider({ userId, initial, children }: UnreadCountsProviderProps) {
  const [counts, setCounts] = useState(initial);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup = () => {};

    // Client Supabase chargé à la demande : rien n'est téléchargé pour les visiteurs.
    void import("@/lib/supabase/client").then(({ getSupabaseBrowserClient }) => {
      const supabase = getSupabaseBrowserClient();
      if (cancelled || !supabase) return;

      const fetchCounts = async () => {
        const [messages, notifications] = await Promise.all([
          supabase.rpc("get_unread_messages_count"),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false)
            .neq("type", "new_message"),
        ]);
        if (cancelled) return;
        setCounts((current) => ({
          messages: messages.error ? current.messages : messages.data,
          notifications: notifications.error
            ? current.notifications
            : (notifications.count ?? current.notifications),
        }));
      };

      // Regroupe les rafales d'événements (plusieurs messages lus d'un coup).
      const refresh = () => {
        clearTimeout(timer);
        timer = setTimeout(() => void fetchCounts(), 400);
      };
      refreshRef.current = refresh;

      const channel = supabase
        .channel(`unread:${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          refresh,
        )
        .subscribe();
      cleanup = () => void supabase.removeChannel(channel);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      refreshRef.current = () => {};
      cleanup();
    };
  }, [userId]);

  // Les mises en page ne sont pas recalculées lors des navigations côté client.
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    refreshRef.current();
  }, [pathname]);

  return <UnreadCountsContext value={userId ? counts : NO_COUNTS}>{children}</UnreadCountsContext>;
}

/** Pastille de compteur (masquée à zéro). Le texte accessible est porté par le lien. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-danger-solid px-1 text-[0.625rem] leading-none font-bold text-white ring-2 ring-background",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Pastille visuelle d'un lien de navigation (messages ou notifications). */
export function UnreadBadge({ kind, className }: { kind: keyof UnreadCounts; className?: string }) {
  return <CountBadge count={useUnreadCounts()[kind]} className={className} />;
}

/** Texte accessible associé, à placer après le libellé du lien. */
export function UnreadLabel({ kind }: { kind: keyof UnreadCounts }) {
  const count = useUnreadCounts()[kind];
  if (count <= 0) return null;
  const t = getDictionary();
  const label =
    kind === "messages" ? t.nav.unreadMessages(count) : t.nav.unreadNotifications(count);
  return <span className="sr-only">{`, ${label}`}</span>;
}
