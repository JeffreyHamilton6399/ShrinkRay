"use client";

import * as React from "react";
import { ResultCard } from "@/components/result-card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compressVideo,
  type VideoTargetFormat,
  type CompressedVideo,
} from "@/lib/compress-video";

interface SrcInfo {
  width: number;
  height: number;
  duration: number;
}

interface ResInfo {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  engine: string;
}

interface Props {
  file: File;
  onClear: () => void;
}

const PRESETS = [
  { value: "0", label: "Original" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "360", label: "360p" },
];

export function VideoCompressor({ file, onClear }: Props) {
  const [src, setSrc] = React.useState<SrcInfo | null>(null);
  const [res, setRes] = React.useState<ResInfo | null>(null);
  const [status, setStatus] = React.useState<
    "processing" | "done" | "error"
  >("processing");
  const [progress, setProgress] = React.useState(0);
  const [enginePhase, setEnginePhase] = React.useState<
    "loading-engine" | "compressing" | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);
  const [quality, setQuality] = React.useState(50);
  const [targetHeight, setTargetHeight] = React.useState(720);
  const [format, setFormat] = React.useState<VideoTargetFormat>("video/webm");
  const abortRef = React.useRef<AbortController | null>(null);

  // Load metadata on mount.
  React.useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      if (cancelled) return;
      setSrc({
        width: v.videoWidth,
        height: v.videoHeight,
        duration: v.duration,
      });
    };
    v.onerror = () => {
      if (cancelled) return;
      setError("Could not read this video");
      setStatus("error");
    };
    v.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const start = React.useCallback(async () => {
    if (!src) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRes((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setStatus("processing");
    setProgress(0);
    setEnginePhase("loading-engine");
    setError(null);
    try {
      const r: CompressedVideo = await compressVideo(
        file,
        {
          quality,
          targetHeight,
          format,
          signal: controller.signal,
          onProgress: (ratio) => {
            setProgress(Math.round(ratio * 100));
          },
          onStatus: (s) => setEnginePhase(s),
        },
        src
      );
      if (controller.signal.aborted) return;
      setRes({
        blob: r.blob,
        url: r.url,
        size: r.blob.size,
        width: r.width,
        height: r.height,
        engine: r.engine,
      });
      setStatus("done");
      setEnginePhase(null);
      setProgress(100);
    } catch (e) {
      if (controller.signal.aborted) {
        setStatus("done");
        setEnginePhase(null);
        return;
      }
      setError(e instanceof Error ? e.message : "Compression failed");
      setStatus("error");
      setEnginePhase(null);
    }
  }, [file, src, quality, targetHeight, format]);

  // Auto-start when metadata is ready or settings change.
  React.useEffect(() => {
    start();
  }, [start]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = () => {
    abortRef.current?.abort();
    setStatus("done");
    setEnginePhase(null);
    setProgress(0);
  };

  const clear = () => {
    abortRef.current?.abort();
    if (res) URL.revokeObjectURL(res.url);
    onClear();
  };

  const download = () => {
    if (!res) return;
    const ext = res.blob.type.includes("mp4") ? "mp4" : "webm";
    const base = file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = res.url;
    a.download = `${base}_compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const showResult = status === "done" && res;

  const progressLabel = !src
    ? "Reading video…"
    : enginePhase === "loading-engine"
      ? "Loading compression engine…"
      : enginePhase === "compressing"
        ? `Compressing… ${progress}%`
        : undefined;

  return (
    <ResultCard
      fileName={file.name}
      originalSize={file.size}
      status={status}
      resultSize={res?.size}
      error={error ?? undefined}
      progress={progress}
      progressLabel={progressLabel}
      preview={
        showResult ? (
          <video
            src={res!.url}
            controls
            className="max-h-44 max-w-full rounded-md bg-black"
          />
        ) : null
      }
      meta={
        showResult
          ? `${res!.width}×${res!.height}${res!.engine === "mediarecorder" ? " · slow" : ""}`
          : src
            ? `${src.width}×${src.height}`
            : undefined
      }
      onDownload={download}
      onClear={clear}
      controls={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card p-3">
          <div className="flex flex-1 items-center gap-3 min-w-[180px]">
            <Label className="shrink-0 text-xs text-muted-foreground">
              Quality
            </Label>
            <Slider
              min={10}
              max={100}
              step={1}
              value={[quality]}
              onValueChange={(v) => setQuality(v[0])}
              disabled={!src}
              className="flex-1"
            />
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {quality}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Resolution</Label>
            <Select
              value={String(targetHeight)}
              onValueChange={(v) => setTargetHeight(Number(v))}
              disabled={!src}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as VideoTargetFormat)}
              disabled={!src}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video/webm">WebM</SelectItem>
                <SelectItem value="video/mp4">MP4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "processing" && src && (
            <div className="ml-auto">
              <Button size="sm" variant="destructive" onClick={cancel}>
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}
