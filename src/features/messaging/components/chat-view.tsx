"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { Fragment, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { cn } from "@/lib/utils";
import { loadOlderMessagesAction, markConversationReadAction, sendMessageAction } from "../actions";
import { dayKey, formatDayLabel, formatMessageTime } from "../format";
import { conversationHref } from "../links";
import { type ChatMessage, MESSAGE_MAX_LENGTH, MESSAGES_PAGE_SIZE } from "../schemas";

type ChatViewProps = {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  /** Raison pour laquelle l'envoi est impossible (ex. utilisateur supprimé). */
  disabledReason?: string | null;
};

function upsert(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index >= 0) {
    const next = [...messages];
    next[index] = message;
    return next;
  }
  return [...messages, message].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Conversation en temps réel (Supabase Realtime, filtré par RLS côté serveur). */
export function ChatView({
  conversationId,
  currentUserId,
  initialMessages,
  initialHasMore,
  disabledReason,
}: ChatViewProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(() => {
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  // Marque comme lus les messages reçus à l'ouverture.
  useEffect(() => {
    if (initialMessages.some((m) => m.sender_id !== currentUserId && !m.read_at)) markRead();
  }, [initialMessages, currentUserId, markRead]);

  // Abonnement aux nouveaux messages et aux accusés de lecture.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const filter = `conversation_id=eq.${conversationId}`;
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter },
        (payload) => {
          const message = payload.new as ChatMessage;
          setMessages((current) => upsert(current, message));
          if (message.sender_id !== currentUserId) markRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter },
        (payload) => setMessages((current) => upsert(current, payload.new as ChatMessage)),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, markRead]);

  // Défile vers le dernier message quand la conversation s'allonge.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const result = await sendMessageAction(conversationId, body);
    setSending(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setDraft("");
    setMessages((current) => upsert(current, result.message));
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    const list = listRef.current;
    const previousHeight = list?.scrollHeight ?? 0;
    const older = await loadOlderMessagesAction(conversationId, oldest.created_at);
    setLoadingOlder(false);
    setHasMore(older.length >= MESSAGES_PAGE_SIZE);
    setMessages((current) => older.reduce(upsert, current));
    // Conserve la position de lecture après l'ajout des anciens messages.
    requestAnimationFrame(() => {
      if (list) list.scrollTop += list.scrollHeight - previousHeight;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Entrée envoie sur ordinateur ; Maj+Entrée insère un retour à la ligne.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      if (window.matchMedia("(pointer: fine)").matches) {
        event.preventDefault();
        void send();
      }
    }
  }

  const lastOwnRead = [...messages].reverse().find((m) => m.sender_id === currentUserId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Messages"
        className="flex min-h-[50vh] flex-1 flex-col gap-1 overflow-y-auto py-4"
      >
        {hasMore ? (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadOlder()}
              loading={loadingOlder}
            >
              Messages précédents
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            Présentez-vous et posez vos questions sur l&apos;article. Ne communiquez jamais vos
            codes Mobile Money.
          </p>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.sender_id === currentUserId;
          const previous = messages[index - 1];
          const newDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at);
          return (
            <Fragment key={message.id}>
              {newDay ? (
                <p className="my-3 text-center text-xs font-medium text-muted-foreground">
                  {formatDayLabel(message.created_at)}
                </p>
              ) : null}
              <div
                className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-card",
                    mine
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-card-foreground",
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[0.6875rem]",
                      mine ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    <span className="sr-only">{mine ? "Vous, " : "Reçu, "}</span>
                    {formatMessageTime(message.created_at)}
                    {mine && message.id === lastOwnRead?.id && message.read_at ? " · Vu" : ""}
                  </p>
                </div>
                {!mine && message.sender_id ? (
                  <ReportDialog
                    targetType="message"
                    targetId={message.id}
                    signedIn
                    returnTo={conversationHref(conversationId)}
                    variant="icon"
                    className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                  />
                ) : null}
              </div>
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] border-t border-border bg-background py-3 md:bottom-0">
        {disabledReason ? (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
            {disabledReason}
          </p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="message-input" className="sr-only">
              Votre message
            </label>
            <textarea
              id="message-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Écrire un message…"
              className="field-sizing-content max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-base focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              disabled={!draft.trim() || sending}
              aria-label="Envoyer"
            >
              {sending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <SendHorizontal aria-hidden="true" />
              )}
            </Button>
          </form>
        )}
        {error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
