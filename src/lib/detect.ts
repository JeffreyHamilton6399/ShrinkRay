/** Auto-detect what kind of file was dropped so we can route it. */

import { isSupportedImage } from "./compress-image";
import { isSupportedVideo, isAnimatedGif } from "./compress-video";
import { isSupportedAudio } from "./compress-audio";
import { isPdf } from "./compress-pdf";
import { is3DModel } from "./compress-3d";

export type MediaKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "svg"
  | "3d"
  | "file";

/** Quick sync detection (doesn't distinguish animated GIFs). */
export function detectKind(file: File): MediaKind {
  if (isPdf(file)) return "pdf";
  if (isSvg(file)) return "svg";
  if (is3DModel(file)) return "3d";
  if (isSupportedVideo(file)) return "video";
  if (isSupportedAudio(file)) return "audio";
  // GIFs and other images — may be reclassified to "video" if animated
  if (isSupportedImage(file)) return "image";
  return "file";
}

/** Async detection that reclassifies animated GIFs as video. */
export async function detectKindAsync(file: File): Promise<MediaKind> {
  const kind = detectKind(file);
  if (kind === "image" && /\.gif$/i.test(file.name)) {
    if (await isAnimatedGif(file)) return "video";
  }
  return kind;
}

export function isSvg(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}
