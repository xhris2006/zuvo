"use client";

import { Camera, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET } from "../avatar-url";
import { useT } from "@/i18n/client";

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
  const t = useT();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [avatarPath, setAvatarPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setMessage(null);
    if (!file.type.startsWith("image/")) {
      setMessage(t.profileForms.chooseImage);
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setMessage(t.profileForms.imageTooLarge);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage(t.profileForms.storageMissing);
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
      setMessage(t.profileForms.photoReady);
    } catch (caught) {
      setMessage(
        caught instanceof ImageProcessingError
          ? t.images[caught.code]
          : t.profileForms.uploadFailed,
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto() {
    setAvatarPath("-");
    setPreview(null);
    setMessage(t.profileForms.photoWillBeRemoved);
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
            {preview ? t.profileForms.changePhoto : t.profileForms.addPhoto}
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
              <Trash2 aria-hidden="true" />
              {t.profileForms.removePhoto}
            </Button>
          ) : null}
        </div>
        <label htmlFor={inputId} className="sr-only">
          {t.profileForms.profilePhoto}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {message ?? t.profileForms.photoHint}
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
