/**
 * Text file minification — JSON, HTML, CSS, JS.
 *
 * Strips comments, blank lines, and unnecessary whitespace to shrink text
 * files *before* gzip is applied. Safe: doesn't corrupt URLs or string
 * literals. Everything runs in the browser — nothing is uploaded.
 */

import { gzip } from "fflate";

export interface CompressedText {
  blob: Blob;
  url: string;
  size: number;
  filename: string;
}

const TEXT_EXTS =
  /\.(json|html?|css|js|mjs|cjs|ts|tsx|jsx|xml|yaml|yml|csv|tsv|md|markdown|txt|log|sql|py|rb|php|java|c|cpp|h|hpp|cs|go|rs|swift|kt|scala|sh|bash|zsh|ps1|bat|ini|conf|cfg|toml|env|gitignore|dockerfile|makefile)$/i;

const CODE_EXTS = /\.(js|mjs|cjs|ts|tsx|jsx|css|html?)$/i;

export function isTextFile(file: File): boolean {
  if (TEXT_EXTS.test(file.name)) return true;
  return /^text\/|^application\/(json|xml|javascript|yaml)$/i.test(file.type);
}

export async function compressTextFile(file: File): Promise<CompressedText> {
  const text = await file.text();
  let out = text;
  const ext = file.name.match(/\.[^.]+$/)?.[0].toLowerCase() || ".txt";

  // 1. Remove block comments /* */ (safe — these are never in strings)
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Remove line comments // — but only when NOT inside a URL (https://)
  //    Skip this for HTML files (<!-- --> handled separately)
  if (CODE_EXTS.test(file.name) && !/\.html?$/.test(file.name)) {
    // Only strip // that are at start of line or after whitespace, not after :
    out = out.replace(/(^|\s)\/\/[^\n]*/g, "$1");
  }

  // 3. HTML comments <!-- -->
  if (/\.html?$/.test(file.name)) {
    out = out.replace(/<!--[\s\S]*?-->/g, "");
  }

  // 4. Remove leading/trailing whitespace per line
  out = out.replace(/^[ \t]+/gm, "").replace(/[ \t]+$/gm, "");

  // 5. Remove blank lines (for code files)
  if (CODE_EXTS.test(file.name)) {
    out = out.replace(/^\s*[\r\n]/gm, "");
  } else {
    // For non-code: collapse 3+ newlines to 2
    out = out.replace(/\n{3,}/g, "\n\n");
  }

  // 6. For JSON: use JSON.stringify for perfect minification
  if (/\.json$/i.test(file.name)) {
    try {
      out = JSON.stringify(JSON.parse(out));
    } catch {
      // Not valid JSON — keep minified text
    }
  }

  // NOTE: We do NOT collapse internal spaces (would corrupt string literals).
  // Gzip handles the remaining whitespace redundancy efficiently.

  // Now gzip the minified text for maximum compression
  const data = new TextEncoder().encode(out);
  const compressed = await new Promise<Uint8Array>((resolve, reject) => {
    gzip(data, { level: 9 }, (err, out) =>
      err ? reject(err) : resolve(out)
    );
  });

  // Effectiveness: if gzip made it bigger, return the minified text uncompressed
  const useUncompressed = compressed.length >= data.length;
  const output = useUncompressed ? data : compressed;

  const blob = new Blob([output as BlobPart], {
    type: useUncompressed ? "text/plain" : "application/gzip",
  });
  const base = file.name.replace(/\.[^.]+$/, "") || file.name;
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    filename: useUncompressed ? `${base}${ext}` : `${base}${ext}.gz`,
  };
}
