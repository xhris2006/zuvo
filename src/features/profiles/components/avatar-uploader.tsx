"use client";

import { Camera, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET } from "../avatar-url";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

type AvatarUploaderProps = {
  userId: string;
  name: string;
  currentUrl: string | null;
  error?: string;
};

/**
 * Sélection, recadrage et envoi de la photo de profil vers Supabase Storage.
 * Le chemin obtenu est transmis au formulaire (champ caché avatarPath) et
 * n'est enregistré sur le profil qu'à la validation.
 */
export function AvatarUploader({ userId, name, currentUrl, error }: AvatarUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [avatarPath, setAvatarPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setMessage(null);
    if (!file.type.startsWith("image/")) {
      setMessage("Choisissez une image (JPEG, PNG ou WebP).");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setMessage("Image trop volumineuse (15 Mo maximum).");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Le stockage des photos n'est pas configuré.");
      return;
    }

    setUploading(true);
    try {
      const blob = await resizeImage(file, { maxSize: 512, square: true });
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (uploadError) throw uploadError;
      setAvatarPath(path);
      setPreview(URL.createObjectURL(blob));
      setMessage("Photo prête : enregistrez le profil pour la conserver.");
    } catch (caught) {
      setMessage(
        caught instanceof ImageProcessingError
          ? caught.message
          : "L'envoi de la photo a échoué. Veuillez réessayer.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto() {
    setAvatarPath("-");
    setPreview(null);
    setMessage("La photo sera retirée à l'enregistrement.");
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="avatarPath" value={avatarPath} />
      <Avatar name={name} src={preview} size="xl" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden="true" />
            {preview ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
              <Trash2 aria-hidden="true" />
              Retirer
            </Button>
          ) : null}
        </div>
        <label htmlFor={inputId} className="sr-only">
          Photo de profil
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {message ?? "JPEG, PNG ou WebP. L'image est recadrée et allégée automatiquement."}
        </p>
        {error ? (
          <p className="text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
