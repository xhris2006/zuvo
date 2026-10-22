import "server-only";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  type ChatMessage,
  MESSAGE_PHOTO_BUCKET,
  MESSAGE_PHOTO_URL_TTL,
  type PhotoUrls,
} from "./schemas";

/**
 * Liens signés (temporaires) vers les photos des messages. Le client de
 * l'utilisateur est utilisé : Storage n'accepte que les participants de la
 * conversation (RLS). Aucune photo ne passe par l'optimiseur d'images de
 * Next.js, qui la mettrait en cache.
 */
export async function signMessagePhotos(
  supabase: TypedSupabaseClient,
  messages: Pick<ChatMessage, "attachment_path">[],
): Promise<PhotoUrls> {
  const paths = [...new Set(messages.flatMap((message) => message.attachment_path ?? []))];
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(MESSAGE_PHOTO_BUCKET)
    .createSignedUrls(paths, MESSAGE_PHOTO_URL_TTL);
  if (error || !data) return {};
  const urls: PhotoUrls = {};
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  }
  return urls;
}
