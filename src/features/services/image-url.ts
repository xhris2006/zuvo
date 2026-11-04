import { publicStorageUrl } from "@/lib/supabase/config";

export const SERVICE_IMAGE_BUCKET = "service-images";

/** URL publique d'une photo de service. */
export function serviceImageUrl(path: string): string | null {
  return publicStorageUrl(SERVICE_IMAGE_BUCKET, path);
}

/** Chemin Storage d'une nouvelle photo : <prestataire>/<service>/<fichier>. */
export function newServiceImagePath(providerId: string, serviceId: string, extension: string) {
  return `${providerId}/${serviceId}/${crypto.randomUUID()}.${extension}`;
}
