"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { updateAvatarAction } from "../actions";
import { AVATAR_BUCKET } from "../avatar-url";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

type AvatarQuickEditProps = {
  userId: string;
  name: string;
  currentUrl: string | null;
  className?: string;
  /** Classes de la photo (taille, typographie). */
  avatarClassName?: string;
  /** Classes du message d'état (position). */
  messageClassName?: string;
};

/**
 * Photo de profil modifiable d'un geste depuis « Mon profil » : la photo
 * choisie est recadrée, allégée, envoyée puis enregistrée immédiatement.
 */
export function AvatarQuickEdit({
  userId,
  name,
  currentUrl,
  className,
  avatarClassName,
  messageClassName,
}: AvatarQuickEditProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setMessage(null);
    if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
      setMessage("Choisissez une image de moins de 15 Mo.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    try {
      const blob = await resizeImage(file, { maxSize: 512, square: true });
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      const result = await updateAvatarAction(path);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setPreview(URL.createObjectURL(blob));
      setMessage("Photo de profil mise à jour.");
      router.refresh();
    } catch (caught) {
      setMessage(
        caught instanceof ImageProcessingError
          ? caught.message
          : "L'envoi de la photo a échoué. Veuillez réessayer.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <label
        htmlFor={inputId}
        className="group relative block cursor-pointer rounded-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
      >
        <Avatar
          name={name}
          src={preview}
          size="xl"
          className={cn("size-20 text-xl sm:size-24 sm:text-2xl", avatarClassName)}
        />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white transition-opacity",
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          aria-hidden="true"
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
        </span>
        <span
          className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-card"
          aria-hidden="true"
        >
          <Camera className="size-4" />
        </span>
        <span className="sr-only">
          {preview ? "Changer la photo de profil" : "Ajouter une photo de profil"}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>
      {message ? (
        <p
          role="status"
          className={cn(
            "absolute top-full left-0 z-10 mt-1 w-48 text-xs text-muted-foreground",
            messageClassName,
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
