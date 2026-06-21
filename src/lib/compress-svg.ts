/**
 * SVG minification — strips metadata, comments, whitespace, and editor
 * namespaces to shrink SVG files. Safe: preserves id attributes (needed for
 * <use href="#id"> references) and doesn't corrupt text content.
 * Pure string processing, no dependencies. Everything runs in browser.
 */

export interface CompressedSvg {
  blob: Blob;
  url: string;
  size: number;
  originalSize: number;
}

export function isSvg(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

export async function compressSvg(file: File): Promise<CompressedSvg> {
  const text = await file.text();
  let out = text;

  // 1. Remove XML comments (but keep IE conditional comments)
  out = out.replace(/<!--(?!\[if).*?-->/gs, "");

  // 2. Remove XML declaration and DOCTYPE
  out = out.replace(/<\?xml[^>]*\?>/gi, "");
  out = out.replace(/<!DOCTYPE[^>]*>/gi, "");

  // 3. Remove metadata element
  out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");

  // 4. Remove editor metadata (Inkscape, Sketch, Adobe) — safe to remove
  out = out.replace(/<sodipodi:[\s\S]*?<\/sodipodi:\w+>/gi, "");
  out = out.replace(/<inkscape:[\s\S]*?<\/inkscape:\w+>/gi, "");
  out = out.replace(/\s(?:sodipodi|inkscape):[a-z-]+="[^"]*"/gi, "");

  // 5. NOTE: Do NOT strip id attributes — they're needed for <use href="#id">
  //    and CSS selectors. Removing them breaks SVGs with references.

  // 6. Collapse whitespace between tags
  out = out.replace(/>\s+</g, "><");

  // 7. Collapse multiple spaces/newlines into single space
  out = out.replace(/\s{2,}/g, " ");

  // 8. Remove spaces around brackets
  out = out.replace(/\s*>\s*/g, ">");
  out = out.replace(/\s*<\s*/g, "<");

  // 9. Remove trailing space before />
  out = out.replace(/\s\/>/g, "/>");

  // 10. Remove empty attributes (attr="")
  out = out.replace(/\s[a-z-]+=""/gi, "");

  // NOTE: Do NOT decode/re-encode &lt; &gt; — that corrupts text content
  // inside <text> nodes (e.g. "5 < 10" would be modified).

  const blob = new Blob([out], { type: "image/svg+xml" });
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    originalSize: file.size, // use actual file size, not string length
  };
}
