/**
 * Browser image hardening: re-encodes via Canvas to strip EXIF (privacy)
 * and downscales the longest edge to MAX_EDGE so we don't upload 12 MP
 * phone photos. Returns the original file untouched on any error.
 */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  // HEIC/HEIF: browsers can't decode these — pass through, server has them.
  if (/^image\/(heic|heif)$/i.test(file.type)) return file;
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  // If the image is already small AND a JPEG, skip the re-encode cost.
  if (scale === 1 && file.type === "image/jpeg" && file.size < 1.5 * 1024 * 1024) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close?.(); return file; }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outType, outType === "image/jpeg" ? JPEG_QUALITY : undefined),
  );
  if (!blob) return file;

  const ext = outType === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() });
}
