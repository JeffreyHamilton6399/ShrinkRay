"use client";

import * as React from "react";
import { ResultCard } from "@/components/result-card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import {
  compressImage,
  extensionFor,
  type ImageTargetFormat,
} from "@/lib/compress-image";

interface Result {
  blob: Blob;
  resultUrl: string;
  size: number;
  width: number;
  height: number;
}

interface Props {
  file: File;
  onClear: () => void;
}

export function ImageCompressor({ file, onClear }: Props) {
  const originalUrl = React.useMemo(() => URL.createObjectURL(file), [file]);
  React.useEffect(() => () => URL.revokeObjectURL(originalUrl), [originalUrl]);

  const [result, setResult] = React.useState<Result | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "processing" | "done" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [quality, setQuality] = React.useState(70);
  const [format, setFormat] = React.useState<ImageTargetFormat>("image/jpeg");
  const [maxDim, setMaxDim] = React.useState(1920);

  const start = React.useCallback(async () => {
    setStatus("processing");
    setError(null);
    try {
      const res = await compressImage(file, {
        quality: quality / 100,
        maxWidth: maxDim || undefined,
        maxHeight: maxDim || undefined,
        format,
        background: "#ffffff",
      });
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.resultUrl);
        return {
          blob: res.blob,
          resultUrl: res.url,
          size: res.blob.size,
          width: res.width,
          height: res.height,
        };
      });
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed");
      setStatus("error");
    }
  }, [file, quality, maxDim, format]);

  // If settings change after a result, mark as stale (need re-compress)
  React.useEffect(() => {
    if (status === "done" || status === "error") {
      setStatus("idle");
    }
  }, [quality, format, maxDim]);

  React.useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.resultUrl);
    },
    [result]
  );

  const clear = () => {
    if (result) URL.revokeObjectURL(result.resultUrl);
    onClear();
  };

  const download = () => {
    if (!result) return;
    const ext = extensionFor(format);
    const base = file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = result.resultUrl;
    a.download = `${base}_compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <ResultCard
      fileName={file.name}
      originalSize={file.size}
      status={status}
      resultSize={result?.size}
      error={error ?? undefined}
      preview={
        <img
          src={status === "done" && result ? result.resultUrl : originalUrl}
          alt={status === "done" ? "compressed" : "original"}
          className="max-h-44 max-w-full rounded-md object-contain"
        />
      }
      meta={result ? `${result.width}×${result.height}px` : undefined}
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
              className="flex-1"
            />
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {quality}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ImageTargetFormat)}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image/jpeg">JPEG</SelectItem>
                <SelectItem value="image/webp">WebP</SelectItem>
                <SelectItem value="image/png">PNG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Max px</Label>
            <Select
              value={String(maxDim)}
              onValueChange={(v) => setMaxDim(Number(v))}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3840">4K</SelectItem>
                <SelectItem value="1920">Full HD</SelectItem>
                <SelectItem value="1280">720p</SelectItem>
                <SelectItem value="800">800</SelectItem>
                <SelectItem value="0">Orig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={start}
              disabled={status === "processing"}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {result ? "Re-compress" : "Compress"}
            </Button>
          </div>
        </div>
      }
    />
  );
}
