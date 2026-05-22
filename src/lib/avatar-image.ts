export const ACCEPTED_AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ACCEPTED_AVATAR_FILE_EXTENSIONS = ".png,.jpg,.jpeg,.webp";

export const ACCEPTED_AVATAR_FORMATS_LABEL = "PNG, JPEG o WebP";

export const MAX_AVATAR_UPLOAD_SIZE = 2 * 1024 * 1024;

const TARGET_AVATAR_SIZE = 768;
const TARGET_AVATAR_QUALITY = 0.82;

export function isAcceptedAvatarMimeType(type: string) {
  return ACCEPTED_AVATAR_MIME_TYPES.includes(
    type as (typeof ACCEPTED_AVATAR_MIME_TYPES)[number],
  );
}

export function validateAvatarFile(file: File) {
  if (!isAcceptedAvatarMimeType(file.type)) {
    return `Formato no permitido. Sube una imagen en ${ACCEPTED_AVATAR_FORMATS_LABEL}.`;
  }

  return null;
}

export async function optimizeAvatarImage(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(
    1,
    TARGET_AVATAR_SIZE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("No se pudo preparar la imagen para subirla.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webpBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", TARGET_AVATAR_QUALITY);
  });

  if (!webpBlob) {
    throw new Error("No se pudo convertir la imagen a WebP.");
  }

  if (webpBlob.size > MAX_AVATAR_UPLOAD_SIZE) {
    throw new Error("La imagen optimizada supera el límite de 2 MB.");
  }

  return webpBlob;
}
