"use client";

import * as React from "react";
import { ResultCard } from "@/components/result-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Square } from "lucide-react";
import {
  compressVideo,
  estimateBitrate,
  type VideoTargetFormat,
} from "@/lib/compress-video";

type Preset = "orig" | "1080" | "720" | "480" | "360";

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
}

interface Props {
  file: File;
  onClear: () => void;
}

export function VideoCompressor({ file, onClear }: Props) {
  const [src, setSrc] = React.useState<SrcInfo | null>(null);
  const [res, setRes] = React.useState<ResInfo | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [preset, setPreset] = React.useState<Preset>("720");
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

  const plan = React.useMemo(() => {
    if (!src) return null;
    const longSide = Math.max(src.width, src.height);
    const target: Record<Preset, number> = {
      orig: longSide,
      "1080": 1920,
      "720": 1280,
      "480": 854,
      "360": 640,
    };
    const ts = target[preset];
    const scale = Math.min(1, ts / longSide);
    const outW = Math.round((src.width * scale) / 2) * 2;
    const outH = Math.round((src.height * scale) / 2) * 2;
    const bitrate = estimateBitrate(outW, outH);
    return { outW, outH, scale, bitrate };
  }, [src, preset]);

  const start = React.useCallback(async () => {
    if (!src || !plan) return;
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
      const r = await compressVideo(file, {
        targetBitrate: plan.bitrate,
        scale: plan.scale,
        format,
        signal: controller.signal,
        onProgress: (ratio) => setProgress(Math.round(ratio * 100)),
      });
      if (controller.signal.aborted) return;
      setRes({
        blob: r.blob,
        url: r.url,
        size: r.blob.size,
        width: r.width,
        height: r.height,
      });
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
  }, [file, src, plan, format]);

  // Auto-start when metadata is ready or settings change.
  React.useEffect(() => {
    start();
  }, [start]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = () => {
    abortRef.current?.abort();
    setStatus("done");
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
  const previewUrl = showResult ? res!.url : null;

  return (
    <ResultCard
      fileName={file.name}
      originalSize={file.size}
      status={status}
      resultSize={res?.size}
      error={error ?? undefined}
      progress={progress}
      progressLabel={
        !src
          ? "Reading video…"
          : status === "processing"
            ? "Re-encoding in real time…"
            : undefined
      }
      preview={
        previewUrl ? (
          <video
            src={previewUrl}
            controls
            className="max-h-44 max-w-full rounded-md bg-black"
          />
        ) : null
      }
      meta={
        showResult
          ? `${res!.width}×${res!.height}`
          : src
            ? `${src.width}×${src.height}`
            : undefined
      }
      onDownload={download}
      onClear={clear}
      controls={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Resolution</Label>
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as Preset)}
              disabled={!src}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orig">Original</SelectItem>
                <SelectItem value="1080">1080p</SelectItem>
                <SelectItem value="720">720p</SelectItem>
                <SelectItem value="480">480p</SelectItem>
                <SelectItem value="360">360p</SelectItem>
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
          {plan && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {(plan.bitrate / 1000).toFixed(0)} kbps
            </Badge>
          )}
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
