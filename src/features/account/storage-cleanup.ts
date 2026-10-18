import "server-only";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

const PAGE = 1000;

type Bucket = "avatars" | "listing-images";

async function listFolder(admin: TypedSupabaseClient, bucket: Bucket, prefix: string) {
  const entries: Array<{ name: string; isFolder: boolean }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data) break;
    // Les « dossiers » n'ont pas d'identifiant dans la réponse de Storage.
    entries.push(...data.map((item) => ({ name: item.name, isFolder: item.id === null })));
    if (data.length < PAGE) break;
  }
  return entries;
}

/**
 * Fichiers publics d'un utilisateur : photo de profil (`avatars/<id>/…`) et
 * photos d'annonces (`listing-images/<id>/<annonce>/…`). Les pièces jointes de
 * messages sont conservées avec les conversations.
 */
export async function listUserFiles(admin: TypedSupabaseClient, userId: string) {
  const avatars = (await listFolder(admin, "avatars", userId))
    .filter((entry) => !entry.isFolder)
    .map((entry) => `${userId}/${entry.name}`);

  const listingImages: string[] = [];
  for (const folder of await listFolder(admin, "listing-images", userId)) {
    if (!folder.isFolder) continue;
    const prefix = `${userId}/${folder.name}`;
    for (const file of await listFolder(admin, "listing-images", prefix)) {
      if (!file.isFolder) listingImages.push(`${prefix}/${file.name}`);
    }
  }
  return { avatars, listingImages };
}

/** Suppression au mieux : un échec n'empêche pas la suite (les fichiers ne sont plus référencés). */
export async function removeUserFiles(
  admin: TypedSupabaseClient,
  files: Awaited<ReturnType<typeof listUserFiles>>,
): Promise<boolean> {
  let ok = true;
  for (const [bucket, paths] of [
    ["avatars", files.avatars],
    ["listing-images", files.listingImages],
  ] as const) {
    for (let i = 0; i < paths.length; i += PAGE) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + PAGE));
      if (error) ok = false;
    }
  }
  return ok;
}
