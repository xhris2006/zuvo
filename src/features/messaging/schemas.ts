import { z } from "zod";

export const MESSAGE_MAX_LENGTH = 2000;

/** Nombre de messages chargés à la fois. */
export const MESSAGES_PAGE_SIZE = 50;

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Écrivez un message.")
  .max(MESSAGE_MAX_LENGTH, `${MESSAGE_MAX_LENGTH} caractères au maximum.`);

/** Texte facultatif accompagnant une photo. */
export const photoCaptionSchema = z
  .string()
  .trim()
  .max(MESSAGE_MAX_LENGTH, `${MESSAGE_MAX_LENGTH} caractères au maximum.`)
  .transform((value) => value || null);

/** Bucket privé des photos de conversation. */
export const MESSAGE_PHOTO_BUCKET = "message-attachments";

/** Durée de validité des liens signés vers les photos (secondes). */
export const MESSAGE_PHOTO_URL_TTL = 60 * 60;

/** Taille maximale (pixels) d'une photo envoyée dans une conversation. */
export const MESSAGE_PHOTO_MAX_SIZE = 1600;

/** Chemin d'une photo déposée dans une conversation : `<conversation>/<uuid>.webp|jpg`. */
export function isMessagePhotoPath(conversationId: string, path: string): boolean {
  return new RegExp(
    `^${conversationId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(webp|jpg)$`,
  ).test(path);
}

export const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, body, attachment_path, created_at, read_at";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  /** Photo jointe (chemin dans le bucket privé), lue via un lien signé. */
  attachment_path: string | null;
  created_at: string;
  read_at: string | null;
};

/** Liens signés des photos, par chemin. */
export type PhotoUrls = Record<string, string>;
