/** Auto-detect what kind of file was dropped so we can route it. */

import { isSupportedImage } from "./compress-image";
import { isSupportedVideo } from "./compress-video";
import { isSupportedAudio } from "./compress-audio";
import { isPdf } from "./compress-pdf";

export type MediaKind = "image" | "video" | "audio" | "pdf" | "file";

export function detectKind(file: File): MediaKind {
  if (isPdf(file)) return "pdf";
  if (isSupportedImage(file)) return "image";
  if (isSupportedVideo(file)) return "video";
  if (isSupportedAudio(file)) return "audio";
  return "file";
}
