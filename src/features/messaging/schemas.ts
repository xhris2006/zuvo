import { z } from "zod";

export const MESSAGE_MAX_LENGTH = 2000;

/** Nombre de messages chargés à la fois. */
export const MESSAGES_PAGE_SIZE = 50;

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Écrivez un message.")
  .max(MESSAGE_MAX_LENGTH, `${MESSAGE_MAX_LENGTH} caractères au maximum.`);

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
};
