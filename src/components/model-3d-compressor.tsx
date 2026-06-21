"use client";

import * as React from "react";
import { Box, Info } from "lucide-react";
import { ResultCard } from "@/components/result-card";
import {
  compress3DModel,
  type CompressedModel,
} from "@/lib/compress-3d";

interface Props {
  file: File;
  onClear: () => void;
}

export function Model3DCompressor({ file, onClear }: Props) {
  const [res, setRes] = React.useState<CompressedModel | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await compress3DModel(file);
        if (cancelled) {
          URL.revokeObjectURL(r.url);
          return;
        }
        setRes(r);
        setStatus("done");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Compression failed");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  React.useEffect(
    () => () => {
      if (res) URL.revokeObjectURL(res.url);
    },
    [res]
  );

  const clear = () => {
    if (res) URL.revokeObjectURL(res.url);
    onClear();
  };

  const download = () => {
    if (!res) return;
    const a = document.createElement("a");
    a.href = res.url;
    a.download = res.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <ResultCard
      fileName={file.name}
      originalSize={file.size}
      status={status}
      resultSize={res?.size}
      error={error ?? undefined}
      preview={
        <div className="flex flex-col items-center gap-2 py-2 text-muted-foreground">
          <Box className="h-12 w-12 text-emerald-500" />
          <p className="text-xs">→ {res?.filename ?? "compressed.gz"}</p>
        </div>
      }
      onDownload={download}
      onClear={clear}
      downloadLabel="Download .gz"
      warning={
        <div className="flex items-start gap-2 rounded-md bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            3D models are gzipped (30-80% smaller). The .gz file works
            directly in Three.js, Babylon.js, and most web 3D engines with
            gzip decompression enabled.
          </span>
        </div>
      }
    />
  );
}
