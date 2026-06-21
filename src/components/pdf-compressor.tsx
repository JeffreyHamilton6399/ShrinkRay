"use client";

import * as React from "react";
import { ResultCard } from "@/components/result-card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  compressPdf,
  type CompressedPdf,
} from "@/lib/compress-pdf";

interface Props {
  file: File;
  onClear: () => void;
}

export function PdfCompressor({ file, onClear }: Props) {
  const url = React.useMemo(() => URL.createObjectURL(file), [file]);
  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const [res, setRes] = React.useState<CompressedPdf | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [progress, setProgress] = React.useState(0);
  const [pageInfo, setPageInfo] = React.useState({ page: 0, total: 0 });
  const [error, setError] = React.useState<string | null>(null);
  const [quality, setQuality] = React.useState(60);
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
    setPageInfo({ page: 0, total: 0 });
    setError(null);
    try {
      const r = await compressPdf(file, {
        quality,
        signal: controller.signal,
        onProgress: (ratio, page, total) => {
          setProgress(Math.round(ratio * 100));
          setPageInfo({ page, total });
        },
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
  }, [file, quality]);

  // Auto-run on mount and when quality changes.
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
    a.download = `${base}_compressed.pdf`;
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
      progressLabel={
        status === "processing"
          ? `Rendering pages… ${pageInfo.total > 0 ? `(${pageInfo.page}/${pageInfo.total})` : ""}`
          : undefined
      }
      preview={
        <iframe
          src={previewUrl}
          title="PDF preview"
          className="h-44 w-full max-w-sm rounded-md border bg-white"
        />
      }
      meta={showResult ? `${res!.pages} pages` : undefined}
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
              {quality}
            </Badge>
          </div>
        </div>
      }
    />
  );
}
