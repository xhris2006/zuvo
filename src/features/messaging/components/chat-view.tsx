"use client";

import { ImageIcon, ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import {
  type ChangeEvent,
  Fragment,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { PhotoViewer } from "@/components/ui/photo-viewer";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { intlLocales } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { loadOlderMessagesAction, markConversationReadAction, sendMessageAction } from "../actions";
import { createMessageFormatters, dayKey } from "../format";
import { conversationHref } from "../links";
import {
  type ChatMessage,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PHOTO_BUCKET,
  MESSAGE_PHOTO_MAX_SIZE,
  MESSAGE_PHOTO_URL_TTL,
  MESSAGES_PAGE_SIZE,
  type PhotoUrls,
} from "../schemas";

type ChatViewProps = {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  /** Liens signés des photos des messages initiaux. */
  initialPhotoUrls?: PhotoUrls;
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
  initialPhotoUrls = {},
  initialHasMore,
  disabledReason,
}: ChatViewProps) {
  const t = useT();
  const locale = useLocale();
  const formats = useMemo(
    () => createMessageFormatters(intlLocales[locale], t.messaging),
    [locale, t],
  );
  const [messages, setMessages] = useState(initialMessages);
  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>(initialPhotoUrls);
  const [photo, setPhoto] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const path = message.attachment_path;
          if (path) {
            // Lien signé pour une photo reçue en direct (RLS : participants seulement).
            void supabase.storage
              .from(MESSAGE_PHOTO_BUCKET)
              .createSignedUrl(path, MESSAGE_PHOTO_URL_TTL)
              .then(({ data }) => {
                const url = data?.signedUrl;
                if (url)
                  setPhotoUrls((current) =>
                    current[path] ? current : { ...current, [path]: url },
                  );
              });
          }
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

  // Défile vers le dernier message quand la conversation s'allonge (la page
  // entière défile ; la zone de saisie reste collée en bas de l'écran).
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (lastId) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [lastId]);

  /** Retire la photo choisie sans l'envoyer (et libère son aperçu local). */
  function discardPhoto() {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(null);
  }

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setPreparingPhoto(true);
    try {
      // Redimensionnée et sans métadonnées (dont la position GPS) avant l'envoi.
      const blob = await resizeImage(file, { maxSize: MESSAGE_PHOTO_MAX_SIZE, quality: 0.82 });
      discardPhoto();
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch (caught) {
      setError(
        caught instanceof ImageProcessingError
          ? t.images[caught.code]
          : t.messaging.unreadablePhoto,
      );
    } finally {
      setPreparingPhoto(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if ((!body && !photo) || sending) return;
    setSending(true);
    setError(null);

    let photoPath: string | null = null;
    if (photo) {
      const supabase = getSupabaseBrowserClient();
      const extension = photo.blob.type === "image/webp" ? "webp" : "jpg";
      photoPath = `${conversationId}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase?.storage
        .from(MESSAGE_PHOTO_BUCKET)
        .upload(photoPath, photo.blob, { contentType: photo.blob.type, upsert: false });
      if (!upload || upload.error) {
        setSending(false);
        setError(t.messaging.photoSendFailed);
        return;
      }
    }

    const result = await sendMessageAction(conversationId, body, photoPath);
    setSending(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    if (photoPath && photo) {
      // La photo envoyée s'affiche tout de suite depuis l'aperçu local.
      const sentPath = photoPath;
      const previewUrl = photo.previewUrl;
      setPhotoUrls((current) => ({ ...current, [sentPath]: previewUrl }));
    }
    setDraft("");
    setPhoto(null);
    setMessages((current) => upsert(current, result.message));
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    const previousHeight = document.documentElement.scrollHeight;
    const older = await loadOlderMessagesAction(conversationId, oldest.created_at);
    setLoadingOlder(false);
    setHasMore(older.messages.length >= MESSAGES_PAGE_SIZE);
    setPhotoUrls((current) => ({ ...older.photoUrls, ...current }));
    setMessages((current) => older.messages.reduce(upsert, current));
    // Conserve la position de lecture après l'ajout des anciens messages.
    requestAnimationFrame(() => {
      window.scrollBy(0, document.documentElement.scrollHeight - previousHeight);
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
        role="log"
        aria-live="polite"
        aria-label={t.messaging.log}
        className="flex flex-1 flex-col gap-1 py-4"
      >
        {hasMore ? (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadOlder()}
              loading={loadingOlder}
            >
              {t.messaging.olderMessages}
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            {t.messaging.intro}
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
                  {formats.dayLabel(message.created_at)}
                </p>
              ) : null}
              <div
                className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl text-sm shadow-card",
                    message.attachment_path ? "p-1" : "px-3.5 py-2",
                    mine
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-card-foreground",
                  )}
                >
                  {message.attachment_path ? (
                    <MessagePhoto
                      url={photoUrls[message.attachment_path] ?? null}
                      onOpen={(url) => setViewer(url)}
                    />
                  ) : null}
                  {message.body ? (
                    <p
                      className={cn(
                        "break-words whitespace-pre-wrap",
                        message.attachment_path && "px-2.5 pt-1.5",
                      )}
                    >
                      {message.body}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "mt-1 text-right text-[0.6875rem]",
                      message.attachment_path && "px-2.5 pb-1",
                      mine ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    <span className="sr-only">
                      {mine ? t.messaging.youSent : t.messaging.received}
                      {message.attachment_path && !message.body ? t.messaging.aPhoto : ""}
                    </span>
                    {formats.time(message.created_at)}
                    {mine && message.id === lastOwnRead?.id && message.read_at
                      ? t.messaging.seen
                      : ""}
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
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:mx-0 sm:px-0 md:pb-4">
        {disabledReason ? (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
            {disabledReason}
          </p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {photo ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                <img
                  src={photo.previewUrl}
                  alt={t.messaging.photoReadyAlt}
                  className="size-14 rounded-lg object-cover"
                />
                <p className="flex-1 text-sm text-muted-foreground">{t.messaging.photoReady}</p>
                <button
                  type="button"
                  onClick={discardPhoto}
                  disabled={sending}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t.messaging.removePhoto}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => void pickPhoto(event)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                loading={preparingPhoto}
                disabled={sending || preparingPhoto}
                aria-label={t.messaging.attachPhoto}
              >
                {preparingPhoto ? null : <ImagePlus aria-hidden="true" />}
              </Button>
              <label htmlFor="message-input" className="sr-only">
                {t.messaging.yourMessage}
              </label>
              <textarea
                id="message-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={MESSAGE_MAX_LENGTH}
                placeholder={photo ? t.messaging.addMessage : t.messaging.writeMessage}
                className="field-sizing-content max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-control focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 rounded-full"
                disabled={(!draft.trim() && !photo) || sending}
                aria-label={t.messaging.send}
              >
                {sending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <SendHorizontal aria-hidden="true" />
                )}
              </Button>
            </div>
          </form>
        )}
        {error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <PhotoViewer
        src={viewer}
        alt={t.messaging.conversationPhoto}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}

/** Photo d'un message : miniature cliquable, ou espace réservé (chargement, lien expiré). */
function MessagePhoto({ url, onOpen }: { url: string | null; onOpen: (url: string) => void }) {
  const t = useT();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) {
    return (
      <div className="flex h-48 w-56 max-w-full flex-col items-center justify-center gap-1 rounded-xl bg-muted text-muted-foreground">
        <ImageIcon className="size-6" aria-hidden="true" />
        <span className={cn("text-xs", !url && "sr-only")}>
          {url ? t.messaging.photoUnavailable : t.messaging.photoLoading}
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className="block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={t.messaging.enlargePhoto}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- photo privée (lien signé), jamais optimisée ni mise en cache par le serveur */}
      <img
        src={url}
        alt={t.messaging.sentPhoto}
        loading="lazy"
        onError={() => setFailedUrl(url)}
        className="max-h-72 w-60 max-w-full bg-muted object-cover sm:w-72"
      />
    </button>
  );
}
