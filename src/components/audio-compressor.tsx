"use client";

import * as React from "react";
import { ResultCard } from "@/components/result-card";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  compressAudio,
  type CompressedAudio,
} from "@/lib/compress-audio";
import { formatDuration } from "@/lib/format";

const BITRATES = [320, 256, 192, 160, 128, 96, 64] as const;

interface Props {
  file: File;
  onClear: () => void;
}

export function AudioCompressor({ file, onClear }: Props) {
  const url = React.useMemo(() => URL.createObjectURL(file), [file]);
  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const [res, setRes] = React.useState<CompressedAudio | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [bitrate, setBitrate] = React.useState(128);
  const [channels, setChannels] = React.useState<"auto" | 1 | 2>("auto");
  const abortRef = React.useRef<AbortController | null>(null);

  const start = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRes((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setStatus("processing");
    setProgress(0);
    setError(null);
    try {
      const r = await compressAudio(file, {
        bitrateKbps: bitrate,
        channels,
        signal: controller.signal,
        onProgress: (ratio) => setProgress(Math.round(ratio * 100)),
      });
      if (controller.signal.aborted) return;
      setRes(r);
      setStatus("done");
      setProgress(100);
    } catch (e) {
      if (controller.signal.aborted) {
        setStatus("done");
        return;
      }
      setError(e instanceof Error ? e.message : "Compression failed");
      setStatus("error");
    }
  }, [file, bitrate, channels]);

  // Auto-run on mount and when settings change.
  React.useEffect(() => {
    start();
  }, [start]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const clear = () => {
    abortRef.current?.abort();
    if (res) URL.revokeObjectURL(res.url);
    onClear();
  };

  const download = () => {
    if (!res) return;
    const base = file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = res.url;
    a.download = `${base}_compressed.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const showResult = status === "done" && res;
  const previewUrl = showResult ? res!.url : url;

  return (
    <ResultCard
      fileName={file.name}
      originalSize={file.size}
      status={status}
      resultSize={res?.blob.size}
      error={error ?? undefined}
      progress={progress}
      progressLabel="Encoding MP3…"
      preview={
        <audio
          src={previewUrl}
          controls
          className="w-full max-w-md"
          aria-label="audio preview"
        />
      }
      meta={
        showResult
          ? `${bitrate}k · ${res!.channels === 1 ? "mono" : "stereo"} · ${formatDuration(res!.duration)}`
          : undefined
      }
      onDownload={download}
      onClear={clear}
      controls={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Bitrate</Label>
            <ToggleGroup
              type="single"
              value={String(bitrate)}
              onValueChange={(v) => v && setBitrate(Number(v))}
              className="gap-0.5"
            >
              {BITRATES.map((b) => (
                <ToggleGroupItem
                  key={b}
                  value={String(b)}
                  className="h-8 px-2.5 text-xs"
                >
                  {b}k
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Channels</Label>
            <ToggleGroup
              type="single"
              value={String(channels)}
              onValueChange={(v) =>
                v && setChannels(v === "auto" ? "auto" : Number(v))
              }
              className="gap-0.5"
            >
              <ToggleGroupItem value="auto" className="h-8 px-2.5 text-xs">
                Auto
              </ToggleGroupItem>
              <ToggleGroupItem value="1" className="h-8 px-2.5 text-xs">
                Mono
              </ToggleGroupItem>
              <ToggleGroupItem value="2" className="h-8 px-2.5 text-xs">
                Stereo
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      }
    />
  );
}
