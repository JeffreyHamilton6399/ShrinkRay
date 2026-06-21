/**
 * Client-side PDF compression.
 *
 * Strategy: render each page of the source PDF to a canvas with pdfjs-dist,
 * then assemble a brand-new PDF with pdf-lib where every page is a single
 * JPEG-compressed image. This achieves real size reduction (the main lever
 * being JPEG quality + render scale) at the cost of losing text/vector
 * selectability. Everything runs in the browser — nothing is uploaded.
 */

// pdfjs-dist and pdf-lib are imported dynamically inside compressPdf() so
// they are only loaded in the browser when PDF compression is actually used.
// This keeps the initial bundle small and avoids any SSR issues with the
// PDF worker. The worker script is served from /public/pdf.worker.min.mjs
// (self-hosted, no CDN).

export interface CompressPdfOptions {
  quality: number; // 1..100 (maps to JPEG quality + render scale)
  signal?: AbortSignal;
  onProgress?: (ratio: number, page: number, total: number) => void;
}

export interface CompressedPdf {
  blob: Blob;
  url: string;
  pages: number;
}

export function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || /\.pdf$/i.test(file.name)
  );
}

function qualityToJpeg(quality: number): number {
  // Map 1..100 → 0.2..0.85 JPEG quality
  const q = Math.max(1, Math.min(100, quality));
  return 0.2 + ((q - 1) / 99) * (0.85 - 0.2);
}

function qualityToScale(quality: number): number {
  // Map 1..100 → 1.0..2.0 render scale
  const q = Math.max(1, Math.min(100, quality));
  return 1.0 + ((q - 1) / 99) * 1.0;
}

async function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas encoding failed"))),
      "image/jpeg",
      quality
    )
  );
  return new Uint8Array(await blob.arrayBuffer());
}

export async function compressPdf(
  file: File,
  opts: CompressPdfOptions
): Promise<CompressedPdf> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const { PDFDocument } = await import("pdf-lib");

  const data = new Uint8Array(await file.arrayBuffer());

  const loadingTask = pdfjsLib.getDocument({
    data,
    // Disable fetchStream / use array buffer; keep worker off the network.
    disableAutoFetch: true,
    disableStream: true,
  });
  const srcPdf = await loadingTask.promise;
  const total = srcPdf.numPages;

  const outDoc = await PDFDocument.create();

  const jpegQuality = qualityToJpeg(opts.quality);
  const baseScale = qualityToScale(opts.quality);

  for (let i = 1; i <= total; i++) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const page = await srcPdf.getPage(i);

    // Cap render resolution so we never blow up memory on huge pages.
    const viewport0 = page.getViewport({ scale: 1 });
    const maxLongSide = 2200;
    const longSide = Math.max(viewport0.width, viewport0.height);
    const capScale = longSide > 0 ? Math.min(1, maxLongSide / longSide) : 1;
    const scale = baseScale * capScale;

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // White background (so transparent PDF areas don't go black in JPEG).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    }).promise;

    const jpgBytes = await canvasToJpegBytes(canvas, jpegQuality);
    const jpgImage = await outDoc.embedJpg(jpgBytes);

    // PDF coordinate origin is bottom-left; match the page size to the image.
    const pdfPage = outDoc.addPage([canvas.width, canvas.height]);
    pdfPage.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });

    opts.onProgress?.(i / total, i, total);
  }

  // Object streams + default compression shrink the output further.
  const outBytes = await outDoc.save({ useObjectStreams: true });

  // Release the source document.
  try {
    await srcPdf.destroy();
  } catch {
    /* noop */
  }

  const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
  return {
    blob,
    url: URL.createObjectURL(blob),
    pages: total,
  };
}
