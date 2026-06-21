/**
 * Client-side audio compression.
 *
 * Strategy: decode the source audio to raw PCM via the Web Audio API,
 * then re-encode to MP3 at a chosen (lower) bitrate with lamejs.
 * This genuinely shrinks MP3 files and converts WAV/FLAC/OGG/M4A to MP3.
 * Everything runs in the browser — nothing is uploaded.
 */

import lamejs from "@breezystack/lamejs";

export interface CompressAudioOptions {
  bitrateKbps: number; // e.g. 128, 96, 64
  channels?: "auto" | 1 | 2; // downmix to mono to save space
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}

export interface CompressedAudio {
  blob: Blob;
  url: string;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrateKbps: number;
}

export function isSupportedAudio(file: File): boolean {
  return (
    /^audio\//i.test(file.type) ||
    /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i.test(file.name)
  );
}

/** Convert a Float32 PCM channel [-1, 1] to Int16 PCM. */
function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export async function compressAudio(
  file: File,
  opts: CompressAudioOptions
): Promise<CompressedAudio> {
  const arrayBuffer = await file.arrayBuffer();

  // Use a temporary (offline-friendly) AudioContext for decoding.
  const AudioCtx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    // Close the context to free resources (best-effort).
    ctx.close().catch(() => {});
  }

  const srcChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const targetChannels =
    opts.channels === "auto"
      ? Math.min(2, srcChannels)
      : (opts.channels as number);
  const useChannels = Math.max(1, Math.min(srcChannels, targetChannels));

  // Gather channel data (downmix to mono if needed).
  const left = audioBuffer.getChannelData(0);
  let leftInt = floatToInt16(left);
  let rightInt: Int16Array | null = null;

  if (useChannels >= 2 && srcChannels >= 2) {
    const right = audioBuffer.getChannelData(1);
    rightInt = floatToInt16(right);
  } else if (useChannels === 1 && srcChannels >= 2) {
    // Already using left only → mono
  }

  const encoder = new lamejs.Mp3Encoder(
    rightInt ? 2 : 1,
    sampleRate,
    opts.bitrateKbps
  );

  // Larger block size = fewer encodeBuffer calls = less overhead.
  // 1152 is the MPEG frame size; multiples of it are most efficient.
  const blockSize = 1152 * 8; // 8 frames per call (was 1)
  const data: Uint8Array[] = [];
  const total = leftInt.length;

  for (let i = 0; i < total; i += blockSize) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const end = Math.min(i + blockSize, total);
    const leftChunk = leftInt.subarray(i, end);
    let mp3buf: Int8Array;
    if (rightInt) {
      const rightChunk = rightInt.subarray(i, end);
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk);
    }
    if (mp3buf.length > 0) {
      data.push(new Uint8Array(mp3buf));
    }
    if (opts.onProgress && total > 0) {
      opts.onProgress(Math.min(1, end / total));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) data.push(new Uint8Array(flush));

  const blob = new Blob(data as BlobPart[], { type: "audio/mpeg" });
  return {
    blob,
    url: URL.createObjectURL(blob),
    duration: audioBuffer.duration,
    sampleRate,
    channels: rightInt ? 2 : 1,
    bitrateKbps: opts.bitrateKbps,
  };
}
