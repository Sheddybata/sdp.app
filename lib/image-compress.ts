/** Browser-only helpers for shrinking uploaded photos to JPEG data URLs. */

const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42] as const;

export type CompressOptions = { maxSide?: number; maxBytes?: number };

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image. Try a different photo."));
    };
    img.src = objectUrl;
  });
}

/**
 * Resize so the longest side is at most `maxSide`, then lower JPEG quality until the
 * result fits in `maxBytes` (returns the smallest attempt if none fit).
 */
export function compressDrawable(
  source: CanvasImageSource,
  width: number,
  height: number,
  { maxSide = 1280, maxBytes = 450 * 1024 }: CompressOptions = {}
): string {
  if (!width || !height) throw new Error("Could not read this image. Try a different photo.");
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  let result = "";
  for (const q of QUALITY_STEPS) {
    result = canvas.toDataURL("image/jpeg", q);
    if (estimateDataUrlBytes(result) <= maxBytes) break;
  }
  return result;
}

export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG or PNG).");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("This image is larger than 15 MB. Please choose a smaller one.");
  }
  const img = await loadImage(file);
  return compressDrawable(img, img.naturalWidth, img.naturalHeight, options);
}
