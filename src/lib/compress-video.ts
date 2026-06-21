/**
 * Video compression via ffmpeg.wasm.
 *
 * Uses the MULTI-THREADED core (2-4x faster) when SharedArrayBuffer is
 * available (needs COOP/COEP headers, configured in next.config.ts). Falls
 * back to single-threaded core otherwise. Both cores are self-hosted in
 * /public/ffmpeg/ (same-origin) so COEP never blocks them.
 *
 * The ffmpeg core (~30 MB) loads on first use and is cached by the browser.
 * Everything runs in the browser — nothing is uploaded.
 *
 * If ffmpeg.wasm fails entirely, falls back to MediaRecorder (real-time).
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export type VideoTargetFormat = "video/webm" | "video/mp4";

export interface CompressVideoOptions {
  quality: number;
  targetHeight: number;
  fps?: number; // target framerate (default 24)
  format: VideoTargetFormat;
  /** "speed" = fastest (ultrafast, no B-frames), "quality" = better encode (fast preset, B-frames) */
  encodeMode?: "speed" | "quality";
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
  engine: "ffmpeg-mt" | "ffmpeg-st" | "mediarecorder";
}

export function isSupportedVideo(file: File): boolean {
  return (
    /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/i.test(file.type) ||
    /\.(mp4|webm|mov|mkv|ogv)$/i.test(file.name)
  );
}

// --- ffmpeg.wasm engine ---

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let loadedEngine: "ffmpeg-mt" | "ffmpeg-st" | null = null;

function hasSharedArrayBuffer(): boolean {
  return typeof SharedArrayBuffer !== "undefined";
}

async function loadFFmpeg(): Promise<{ ff: FFmpeg; engine: "ffmpeg-mt" | "ffmpeg-st" }> {
  if (ffmpegInstance && loadedEngine) {
    return { ff: ffmpegInstance, engine: loadedEngine };
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Try MT core first (2-4x faster, uses multiple CPU cores).
    // The v0.12 API uses classWorkerURL (the ffmpeg.wasm library worker),
    // NOT workerURL (which is the old API / ffmpeg-core worker).
    if (hasSharedArrayBuffer()) {
      try {
        const ff = new FFmpeg();
        // classWorkerURL = ffmpeg.wasm's own worker (NOT the core worker).
        // Copied to /public/ffmpeg/ffmpeg-worker.js for same-origin loading.
        const classWorkerURL = "/ffmpeg/ffmpeg-worker.js";
        const coreURL = await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript");
        const wasmURL = await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm");

        await Promise.race([
          ff.load({ coreURL, wasmURL, classWorkerURL }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("MT timeout")), 10_000)
          ),
        ]);
        ffmpegInstance = ff;
        loadedEngine = "ffmpeg-mt";
        return { ff, engine: "ffmpeg-mt" as const };
      } catch (e) {
        // MT failed — fall through to ST
        void e;
      }
    }

    // ST core — always works, single-threaded but reliable
    const ff = new FFmpeg();
    const coreURL = await toBlobURL("/ffmpeg/st/ffmpeg-core.js", "text/javascript");
    const wasmURL = await toBlobURL("/ffmpeg/st/ffmpeg-core.wasm", "application/wasm");

    await Promise.race([
      ff.load({ coreURL, wasmURL }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Engine load timed out")), 30_000)
      ),
    ]);
    ffmpegInstance = ff;
    loadedEngine = "ffmpeg-st";
    return { ff, engine: "ffmpeg-st" as const };
  })();

  try {
    return await loadPromise;
  } catch (e) {
    loadPromise = null;
    ffmpegInstance = null;
    loadedEngine = null;
    throw new Error(
      `Could not load compression engine. ${e instanceof Error ? e.message : ""}`
    );
  }
}

/** Pre-warm the ffmpeg engine so it's ready when the user uploads a video. */
export function preloadFFmpeg(): void {
  if (typeof window === "undefined") return;
  // Kick off the load in the background — don't await.
  loadFFmpeg().catch(() => {
    /* ignore — will retry on actual use */
  });
}

function qualityToCrf(quality: number, format: VideoTargetFormat): number {
  const q = Math.max(1, Math.min(100, quality));
  if (format === "video/mp4") {
    // x264 CRF: 18 (excellent) → 40 (very small)
    return Math.round(40 - ((q - 1) / 99) * (40 - 18));
  }
  // VP8 CRF: 10 (excellent) → 40 (very small)
  return Math.round(40 - ((q - 1) / 99) * (40 - 10));
}

async function compressWithFFmpeg(
  file: File,
  opts: CompressVideoOptions,
  srcInfo: { width: number; height: number; duration: number }
): Promise<CompressedVideo> {
  opts.onStatus?.("loading-engine");
  const { ff, engine } = await loadFFmpeg();

  opts.onStatus?.("compressing");

  // Write input file
  const inExt = file.name.match(/\.[^.]+$/)?.[0] || ".mp4";
  const inputName = `input${inExt}`;
  const isMp4 = opts.format === "video/mp4";
  const outputName = `output.${isMp4 ? "mp4" : "webm"}`;

  const fileData = new Uint8Array(await file.arrayBuffer());
  await ff.writeFile(inputName, fileData);

  const crf = qualityToCrf(opts.quality, opts.format);
  const args: string[] = ["-i", inputName];

  // Combined video filter: scale + reduce framerate to 24fps in one pass.
  // Framerate reduction is the single biggest speedup for ST ffmpeg —
  // a 60fps source becomes 24fps = 2.5x fewer frames to encode.
  const filters: string[] = [];
  if (opts.targetHeight > 0) {
    const scale = Math.min(
      1,
      opts.targetHeight / Math.max(srcInfo.width, srcInfo.height)
    );
    const targetH = Math.round((srcInfo.height * scale) / 2) * 2;
    filters.push(`scale=-2:${targetH}`);
  }
  filters.push(`fps=${opts.fps ?? 24}`); // reduce framerate — fewer frames = faster
  args.push("-vf", filters.join(","));

  if (isMp4) {
    const qualityMode = opts.encodeMode === "quality";
    const x264Args = [
      "-c:v", "libx264",
      "-preset", qualityMode ? "fast" : "ultrafast",
    ];
    // zerolatency tune only for speed mode — it hurts file compression quality
    if (!qualityMode) x264Args.push("-tune", "zerolatency");
    x264Args.push(
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      "-g", "240",
      "-bf", qualityMode ? "3" : "0",  // B-frames improve quality (disabled for speed)
      "-c:a", "copy"
    );
    args.push(...x264Args);
  } else {
    args.push(
      "-c:v", "libvpx",
      "-deadline", "realtime",
      "-cpu-used", "16",
      "-crf", String(crf),
      "-b:v", "0",
      "-g", "240",
      "-c:a", "libopus",
      "-b:a", "96k"
    );
  }

  args.push(outputName);

  // Progress tracking + watchdog (detects stalled/crashed ffmpeg)
  let lastProgressTime = Date.now();
  const progressHandler = ({ progress }: { progress: number }) => {
    lastProgressTime = Date.now();
    opts.onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ff.on("progress", progressHandler);

  // Watchdog: if no progress event for 90s, ffmpeg has likely crashed
  // (common for very large videos that exceed WASM memory limits).
  const watchdog = setInterval(() => {
    if (Date.now() - lastProgressTime > 90_000) {
      try {
        ff.terminate();
      } catch {
        /* noop */
      }
      ffmpegInstance = null;
      loadPromise = null;
      loadedEngine = null;
    }
  }, 10_000);

  // Abort support
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
    loadedEngine = null;
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
    clearInterval(watchdog);
    ff.off("progress", progressHandler);
    if (opts.signal) {
      opts.signal.removeEventListener("abort", abortHandler);
    }
  }

  if (aborted) throw new DOMException("Aborted", "AbortError");

  const data = await ff.readFile(outputName);
  const mimeType = isMp4 ? "video/mp4" : "video/webm";

  if (!data || (data as Uint8Array).length === 0) {
    throw new Error(
      "Compression produced no output. The video may be too large for browser processing — try a lower resolution or a shorter clip."
    );
  }

  const blob = new Blob([data as BlobPart], { type: mimeType });

  // Cleanup FS to free memory
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
    engine,
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
