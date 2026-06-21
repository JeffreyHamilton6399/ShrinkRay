/**
 * Client-side image compression utilities built on the Canvas API.
 * Everything runs in the browser — no uploads, fully private.
 */

export type ImageTargetFormat = "image/jpeg" | "image/webp" | "image/png";

export interface CompressImageOptions {
  quality: number; // 0..1 (ignored for png)
  maxWidth?: number; // px, preserve aspect if omitted
  maxHeight?: number; // px
  format: ImageTargetFormat;
  background?: string; // fill color for transparent → jpeg
}

export interface CompressedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

export function extensionFor(format: ImageTargetFormat): string {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/webp") return "webp";
  return "png";
}

export function isSupportedImage(file: File): boolean {
  return /^image\/(png|jpeg|webp|gif|bmp|avif)$/i.test(file.type);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function computeDimensions(
  srcW: number,
  srcH: number,
  maxWidth?: number,
  maxHeight?: number
): { w: number; h: number } {
  let w = srcW;
  let h = srcH;
  if (maxWidth && w > maxWidth) {
    h = Math.round((h * maxWidth) / w);
    w = maxWidth;
  }
  if (maxHeight && h > maxHeight) {
    w = Math.round((w * maxHeight) / h);
    h = maxHeight;
  }
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

export async function compressImage(
  file: File,
  opts: CompressImageOptions
): Promise<CompressedImage> {
  const img = await loadImage(file);
  const { w, h } = computeDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    opts.maxWidth,
    opts.maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Fill background when converting transparency → jpeg
  if (opts.format === "image/jpeg" && opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      opts.format,
      opts.format === "image/png" ? undefined : opts.quality
    );
  });

  // Revoke the source object URL to free memory
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: w,
    height: h,
  };
}
