export type CropRect = { sx: number; sy: number; sWidth: number; sHeight: number };
export type TargetSize = { width: number; height: number; crop: CropRect };

/**
 * Calcule la taille de sortie d'une image redimensionnée (sans agrandissement).
 * En mode carré, l'image est recadrée au centre.
 */
export function computeTargetSize(
  width: number,
  height: number,
  maxSize: number,
  square = false,
): TargetSize {
  if (square) {
    const side = Math.min(width, height);
    const output = Math.min(side, maxSize);
    return {
      width: output,
      height: output,
      crop: { sx: (width - side) / 2, sy: (height - side) / 2, sWidth: side, sHeight: side },
    };
  }
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    crop: { sx: 0, sy: 0, sWidth: width, sHeight: height },
  };
}

export class ImageProcessingError extends Error {}

/**
 * Redimensionne et réencode une image dans le navigateur (WebP si possible,
 * JPEG sinon). Les métadonnées EXIF (dont la position GPS) sont supprimées.
 */
export async function resizeImage(
  file: File,
  options: { maxSize: number; square?: boolean; quality?: number },
): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageProcessingError("Format d'image non pris en charge.");
  }

  const { width, height, crop } = computeTargetSize(
    bitmap.width,
    bitmap.height,
    options.maxSize,
    options.square,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageProcessingError("Traitement de l'image impossible.");
  context.drawImage(bitmap, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, width, height);
  bitmap.close();

  const quality = options.quality ?? 0.85;
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  // Certains navigateurs ne savent pas encoder en WebP : repli en JPEG.
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new ImageProcessingError("Traitement de l'image impossible.");
  return jpeg;
}
