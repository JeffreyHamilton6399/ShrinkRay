/**
 * Generic file compression — wraps ANY file into a .zip using fflate.
 *
 * This genuinely shrinks text-based and uncompressed files (txt, csv, json,
 * html, js, logs, docs, bmp, tiff, etc.). Already-compressed formats (mp3,
 * jpg, png, mp4, zip, office docs, etc.) won't shrink much — we surface
 * that honestly. Everything runs in the browser — nothing is uploaded.
 */

import { zip } from "fflate";

export interface CompressedArchive {
  blob: Blob;
  url: string;
  size: number;
  filename: string;
}

export async function compressFile(file: File): Promise<CompressedArchive> {
  const data = new Uint8Array(await file.arrayBuffer());

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(
      { [file.name]: data },
      { level: 9 },
      (err, out) => (err ? reject(err) : resolve(out))
    );
  });

  const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
  const base = file.name.replace(/\.[^.]+$/, "") || file.name;
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    filename: `${base}.zip`,
  };
}

/** Rough heuristic: will zipping meaningfully help this file? */
export function isLikelyIncompressible(file: File): boolean {
  return /\.(zip|7z|rar|gz|bz2|xz|zst|lz|mp3|aac|ogg|opus|oga|m4a|flac|jpg|jpeg|png|webp|avif|gif|heic|mp4|webm|mov|mkv|avi|wmv|flv|woff2?|pdf|docx|xlsx|pptx|odt|ods|odp|epub|jar|war|apk|aab|ipa|dll|so|dylib|class|pyc|wasm|jxl)$/i.test(
    file.name
  );
}
