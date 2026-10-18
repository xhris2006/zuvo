import { publicStorageUrl } from "@/lib/supabase/config";

export const AVATAR_BUCKET = "avatars";

/** URL publique de la photo de profil, ou null s'il n'y en a pas. */
export function avatarUrl(path: string | null | undefined): string | null {
  return path ? publicStorageUrl(AVATAR_BUCKET, path) : null;
}
