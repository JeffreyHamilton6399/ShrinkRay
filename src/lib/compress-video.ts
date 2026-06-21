/**
 * Client-side video compression.
 *
 * Strategy: load the source video into a <video> element, capture its
 * playback stream (video + audio tracks), and re-encode it in real time
 * with MediaRecorder at a lower bitrate / resolution. This runs entirely
 * in the browser — nothing is uploaded.
 */

export type VideoTargetFormat = "video/webm" | "video/mp4";

export interface CompressVideoOptions {
  targetBitrate: number; // bits per second for video track
  scale: number; // 0.25..1 (fraction of original resolution)
  format: VideoTargetFormat;
  audioBitrate?: number; // defaults to 64_000
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}

export interface CompressedVideo {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  duration: number;
  mimeType: string;
}

export function isSupportedVideo(file: File): boolean {
  return /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/i.test(file.type)
    || /\.(mp4|webm|mov|mkv|ogv)$/i.test(file.name);
}

/** Pick the best supported mimeType for the requested format. */
function pickMimeType(format: VideoTargetFormat): string {
  const candidates =
    format === "video/mp4"
      ? [
          'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
          "video/mp4",
        ]
      : [
          'video/webm;codecs="vp9,opus"',
          'video/webm;codecs="vp8,opus"',
          "video/webm",
        ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return format;
}

export async function compressVideo(
  file: File,
  opts: CompressVideoOptions
): Promise<CompressedVideo> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder is not supported in this browser");
  }

  const videoEl = document.createElement("video");
  videoEl.muted = true;
  videoEl.playsInline = true;
  (videoEl as HTMLVideoElement & { crossOrigin?: string }).crossOrigin = "anonymous";
  const srcUrl = URL.createObjectURL(file);
  videoEl.src = srcUrl;

  await new Promise<void>((resolve, reject) => {
    videoEl.onloadedmetadata = () => resolve();
    videoEl.onerror = () => reject(new Error("Could not load video metadata"));
  });

  const srcW = videoEl.videoWidth;
  const srcH = videoEl.videoHeight;
  const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;

  const scale = Math.min(1, Math.max(0.25, opts.scale));
  const outW = Math.max(2, Math.round((srcW * scale) / 2) * 2);
  const outH = Math.max(2, Math.round((srcH * scale) / 2) * 2);

  // Capture stream from the video element, then route through a canvas
  // to apply resolution downscaling.
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const canvasStream = canvas.captureStream(30);

  // Try to carry over the audio track from the source.
  let audioTrack: MediaStreamTrack | null = null;
  try {
    const vStream: MediaStream = (videoEl as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    }).captureStream
      ? (videoEl as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream()
      : (videoEl as HTMLVideoElement & { mozCaptureStream: () => MediaStream }).mozCaptureStream();
    audioTrack = vStream.getAudioTracks()[0] ?? null;
  } catch {
    audioTrack = null;
  }
  if (audioTrack && audioTrack.readyState === "live") {
    canvasStream.addTrack(audioTrack);
  }

  const mimeType = pickMimeType(opts.format);
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: opts.targetBitrate,
    audioBitsPerSecond: opts.audioBitrate ?? 64_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = () => reject(new Error("Recorder error"));
  });

  let rafId = 0;
  let stopped = false;
  const draw = () => {
    if (stopped) return;
    if (!videoEl.paused && !videoEl.ended) {
      ctx.drawImage(videoEl, 0, 0, outW, outH);
    }
    if (duration > 0 && opts.onProgress) {
      opts.onProgress(Math.min(1, videoEl.currentTime / duration));
    }
    rafId = requestAnimationFrame(draw);
  };

  const abortHandler = () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* noop */
    }
  };
  if (opts.signal) {
    if (opts.signal.aborted) {
      abortHandler();
      throw new DOMException("Aborted", "AbortError");
    }
    opts.signal.addEventListener("abort", abortHandler, { once: true });
  }

  try {
    recorder.start(250);
    videoEl.currentTime = 0;
    await videoEl.play();
    draw();

    await new Promise<void>((resolve) => {
      videoEl.onended = () => resolve();
    });

    stopped = true;
    cancelAnimationFrame(rafId);
    if (recorder.state !== "inactive") recorder.stop();
    if (opts.onProgress) opts.onProgress(1);

    const blob = await finished;
    const outUrl = URL.createObjectURL(blob);

    return {
      blob,
      url: outUrl,
      width: outW,
      height: outH,
      duration,
      mimeType,
    };
  } finally {
    canvasStream.getTracks().forEach((t) => t.stop());
    URL.revokeObjectURL(srcUrl);
  }
}

/** Estimate a sensible default bitrate from a target resolution + fps. */
export function estimateBitrate(width: number, height: number, fps = 30): number {
  const pixels = width * height;
  // ~0.07 bits per pixel per frame is a decent "good quality" starting point
  return Math.round(pixels * fps * 0.07);
}
