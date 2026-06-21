/**
 * Video compression via ffmpeg.wasm — processes frames as fast as the CPU
 * allows (not bound to real-time playback like MediaRecorder). Uses the
 * single-threaded core for maximum reliability (no COOP/COEP headers needed).
 * The ffmpeg core (~25 MB) is loaded lazily from a CDN on first use, then
 * cached by the browser. Everything runs in the browser — nothing is uploaded.
 *
 * Fallback: if ffmpeg.wasm fails to load, falls back to MediaRecorder
 * (real-time) so the tool always works.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

export type VideoTargetFormat = "video/webm" | "video/mp4";

export interface CompressVideoOptions {
  quality: number;
  targetHeight: number;
  format: VideoTargetFormat;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
  onStatus?: (status: "loading-engine" | "compressing") => void;
}

export interface CompressedVideo {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  duration: number;
  mimeType: string;
  engine: "ffmpeg" | "mediarecorder";
}

export function isSupportedVideo(file: File): boolean {
  return (
    /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/i.test(file.type) ||
    /\.(mp4|webm|mov|mkv|ogv)$/i.test(file.name)
  );
}

// --- ffmpeg.wasm engine (single-threaded for reliability) ---

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function loadFFmpeg(onProgress?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ff = new FFmpeg();
    const coreURL = await toBlobURL(
      `${CORE_BASE}/ffmpeg-core.js`,
      "text/javascript"
    );
    const wasmURL = await toBlobURL(
      `${CORE_BASE}/ffmpeg-core.wasm`,
      "application/wasm"
    );
    await ff.load({ coreURL, wasmURL });
    ffmpegInstance = ff;
    return ff;
  })();

  try {
    return await loadPromise;
  } catch (e) {
    loadPromise = null;
    ffmpegInstance = null;
    throw new Error(
      `Could not load the compression engine. ${e instanceof Error ? e.message : ""}`
    );
  }
}

function qualityToCrf(quality: number, format: VideoTargetFormat): number {
  const q = Math.max(1, Math.min(100, quality));
  if (format === "video/mp4") {
    return Math.round(40 - ((q - 1) / 99) * (40 - 18));
  }
  return Math.round(40 - ((q - 1) / 99) * (40 - 10));
}

async function compressWithFFmpeg(
  file: File,
  opts: CompressVideoOptions,
  srcInfo: { width: number; height: number; duration: number }
): Promise<CompressedVideo> {
  opts.onStatus?.("loading-engine");
  const ff = await loadFFmpeg();

  opts.onStatus?.("compressing");

  const inExt = file.name.match(/\.[^.]+$/)?.[0] || ".mp4";
  const inputName = `input${inExt}`;
  const isMp4 = opts.format === "video/mp4";
  const outputName = `output.${isMp4 ? "mp4" : "webm"}`;

  await ff.writeFile(inputName, await fetchFile(file));

  const crf = qualityToCrf(opts.quality, opts.format);
  const args: string[] = ["-i", inputName];

  if (opts.targetHeight > 0) {
    const scale = Math.min(
      1,
      opts.targetHeight / Math.max(srcInfo.width, srcInfo.height)
    );
    const targetH = Math.round((srcInfo.height * scale) / 2) * 2;
    args.push("-vf", `scale=-2:${targetH}`);
  }

  if (isMp4) {
    args.push(
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k"
    );
  } else {
    args.push(
      "-c:v", "libvpx",
      "-deadline", "realtime",
      "-cpu-used", "8",
      "-crf", String(crf),
      "-b:v", "0",
      "-c:a", "libopus",
      "-b:a", "128k"
    );
  }

  args.push(outputName);

  const progressHandler = ({ progress }: { progress: number }) => {
    opts.onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ff.on("progress", progressHandler);

  let aborted = false;
  const abortHandler = () => {
    aborted = true;
    try {
      ff.terminate();
    } catch {
      /* noop */
    }
    ffmpegInstance = null;
    loadPromise = null;
  };
  if (opts.signal) {
    if (opts.signal.aborted) {
      abortHandler();
      throw new DOMException("Aborted", "AbortError");
    }
    opts.signal.addEventListener("abort", abortHandler, { once: true });
  }

  try {
    await ff.exec(args);
  } finally {
    ff.off("progress", progressHandler);
    if (opts.signal) {
      opts.signal.removeEventListener("abort", abortHandler);
    }
  }

  if (aborted) throw new DOMException("Aborted", "AbortError");

  const data = await ff.readFile(outputName);
  const mimeType = isMp4 ? "video/mp4" : "video/webm";

  // Critical: check for empty output (ffmpeg failed silently)
  if (!data || (data as Uint8Array).length === 0) {
    throw new Error("Compression produced no output. Try a different format or quality.");
  }

  const blob = new Blob([data as BlobPart], { type: mimeType });

  // Cleanup FS
  try {
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);
  } catch {
    /* noop */
  }

  let outW = srcInfo.width;
  let outH = srcInfo.height;
  if (opts.targetHeight > 0) {
    const scale = Math.min(
      1,
      opts.targetHeight / Math.max(srcInfo.width, srcInfo.height)
    );
    outW = Math.round((srcInfo.width * scale) / 2) * 2;
    outH = Math.round((srcInfo.height * scale) / 2) * 2;
  }

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: outW,
    height: outH,
    duration: srcInfo.duration,
    mimeType,
    engine: "ffmpeg",
  };
}

// --- MediaRecorder fallback (real-time) ---

async function compressWithMediaRecorder(
  file: File,
  opts: CompressVideoOptions,
  srcInfo: { width: number; height: number; duration: number }
): Promise<CompressedVideo> {
  const scale = Math.min(
    1,
    opts.targetHeight > 0
      ? opts.targetHeight / Math.max(srcInfo.width, srcInfo.height)
      : 1
  );
  const outW = Math.max(2, Math.round((srcInfo.width * scale) / 2) * 2);
  const outH = Math.max(2, Math.round((srcInfo.height * scale) / 2) * 2);

  const videoEl = document.createElement("video");
  videoEl.muted = true;
  videoEl.playsInline = true;
  const srcUrl = URL.createObjectURL(file);
  videoEl.src = srcUrl;

  await new Promise<void>((resolve, reject) => {
    videoEl.onloadedmetadata = () => resolve();
    videoEl.onerror = () => reject(new Error("Could not load video"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const stream = canvas.captureStream(30);
  let audioTrack: MediaStreamTrack | null = null;
  try {
    const vStream = (videoEl as HTMLVideoElement & {
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
    stream.addTrack(audioTrack);
  }

  const mimeType = opts.format === "video/mp4" ? "video/mp4" : "video/webm";
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : "video/webm",
    videoBitsPerSecond: Math.round(opts.quality * 50_000),
    audioBitsPerSecond: 64_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("Recorder error"));
  });

  let rafId = 0;
  let stopped = false;
  const draw = () => {
    if (stopped) return;
    if (!videoEl.paused && !videoEl.ended) {
      ctx.drawImage(videoEl, 0, 0, outW, outH);
    }
    if (srcInfo.duration > 0 && opts.onProgress) {
      opts.onProgress(Math.min(1, videoEl.currentTime / srcInfo.duration));
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
    opts.onProgress?.(1);
    const blob = await finished;

    if (blob.size === 0) {
      throw new Error("Compression produced no output.");
    }

    return {
      blob,
      url: URL.createObjectURL(blob),
      width: outW,
      height: outH,
      duration: srcInfo.duration,
      mimeType,
      engine: "mediarecorder",
    };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    URL.revokeObjectURL(srcUrl);
  }
}

// --- Public API ---

export async function compressVideo(
  file: File,
  opts: CompressVideoOptions,
  srcInfo: { width: number; height: number; duration: number }
): Promise<CompressedVideo> {
  try {
    return await compressWithFFmpeg(file, opts, srcInfo);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    // ffmpeg failed — fall back to MediaRecorder
    return await compressWithMediaRecorder(file, opts, srcInfo);
  }
}
