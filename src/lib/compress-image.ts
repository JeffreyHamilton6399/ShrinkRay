/**
 * Client-side image compression utilities built on the Canvas API.
 * Everything runs in the browser — no uploads, fully private.
 */

export type ImageTargetFormat = "image/jpeg" | "image/webp" | "image/png" | "image/avif";

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
  if (format === "image/avif") return "avif";
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
  // createImageBitmap decodes off the main thread — much faster than <Image>.
  let bitmap: ImageBitmap | HTMLImageElement;
  let srcW: number, srcH: number;
  let revokeUrl: string | null = null;

  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file);
      srcW = bitmap.width;
      srcH = bitmap.height;
    } catch {
      // Fallback for Safari/older browsers
      bitmap = await loadImage(file);
      srcW = (bitmap as HTMLImageElement).naturalWidth;
      srcH = (bitmap as HTMLImageElement).naturalHeight;
      if ((bitmap as HTMLImageElement).src.startsWith("blob:")) {
        revokeUrl = (bitmap as HTMLImageElement).src;
      }
    }
  } else {
    bitmap = await loadImage(file);
    srcW = (bitmap as HTMLImageElement).naturalWidth;
    srcH = (bitmap as HTMLImageElement).naturalHeight;
    if ((bitmap as HTMLImageElement).src.startsWith("blob:")) {
      revokeUrl = (bitmap as HTMLImageElement).src;
    }
  }

  const { w, h } = computeDimensions(srcW, srcH, opts.maxWidth, opts.maxHeight);

  // Use OffscreenCanvas when available — encoding runs off the main thread.
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(w, h);
    ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  } else {
    canvas = document.createElement("canvas");
    (canvas as HTMLCanvasElement).width = w;
    (canvas as HTMLCanvasElement).height = h;
    ctx = (canvas as HTMLCanvasElement).getContext("2d")!;
  }
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Fill background when converting transparency → jpeg
  if (opts.format === "image/jpeg" && opts.background) {
    (ctx as CanvasRenderingContext2D).fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);

  // Free the bitmap/Image immediately
  if ("close" in bitmap && typeof (bitmap as ImageBitmap).close === "function") {
    (bitmap as ImageBitmap).close();
  }
  if (revokeUrl) URL.revokeObjectURL(revokeUrl);

  // Encode — OffscreenCanvas.convertToBlob is async + off-main-thread
  let blob: Blob;
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({
      type: opts.format,
      quality: opts.format === "image/png" ? undefined : opts.quality,
    });
  } else {
    blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
        opts.format,
        opts.format === "image/png" ? undefined : opts.quality
      );
    });
  }

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: w,
    height: h,
  };
}
