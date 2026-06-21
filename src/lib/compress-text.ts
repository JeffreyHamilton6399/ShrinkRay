/**
 * Text file minification — JSON, HTML, CSS, JS.
 *
 * Strips whitespace, comments, and unnecessary characters to shrink text
 * files *before* gzip is applied (gzip then compresses the minified output
 * even further). Works on any text-based file. Everything runs in browser.
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

  // 1. Remove comments (CSS/JS/HTML-style)
  // Block comments /* */
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");
  // Line comments // (only in code files, not in URLs/data)
  if (CODE_EXTS.test(file.name) && !/\.html?$/.test(file.name)) {
    out = out.replace(/(^|[^:])\/\/.*$/gm, "$1");
  }
  // HTML comments <!-- -->
  if (/\.html?$/.test(file.name)) {
    out = out.replace(/<!--[\s\S]*?-->/g, "");
  }

  // 2. Remove leading/trailing whitespace per line
  out = out.replace(/^[ \t]+/gm, "").replace(/[ \t]+$/gm, "");

  // 3. Collapse multiple blank lines into one
  out = out.replace(/\n{3,}/g, "\n\n");

  // 4. Remove blank lines entirely (for code)
  if (CODE_EXTS.test(file.name)) {
    out = out.replace(/^\s*[\r\n]/gm, "");
  }

  // 5. Collapse multiple spaces into one (preserve strings — simplified)
  out = out.replace(/[ \t]{2,}/g, " ");

  // 6. For JSON specifically, remove all whitespace
  if (/\.json$/i.test(file.name)) {
    try {
      out = JSON.stringify(JSON.parse(out));
    } catch {
      // Not valid JSON — keep minified text
    }
  }

  // Now gzip the minified text for even more compression
  const data = new TextEncoder().encode(out);
  const compressed = await new Promise<Uint8Array>((resolve, reject) => {
    gzip(data, { level: 9 }, (err, out) =>
      err ? reject(err) : resolve(out)
    );
  });

  const blob = new Blob([compressed as BlobPart], {
    type: "application/gzip",
  });
  const base = file.name.replace(/\.[^.]+$/, "") || file.name;
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    filename: `${base}${ext}.gz`,
  };
}
