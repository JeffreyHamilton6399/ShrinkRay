"use client";

import * as React from "react";
import { FileCode, Info } from "lucide-react";
import { ResultCard } from "@/components/result-card";
import {
  compressTextFile,
  type CompressedText,
} from "@/lib/compress-text";

interface Props {
  file: File;
  onClear: () => void;
}

export function TextCompressor({ file, onClear }: Props) {
  const [res, setRes] = React.useState<CompressedText | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await compressTextFile(file);
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
          <FileCode className="h-12 w-12 text-emerald-500" />
          <p className="text-xs">→ {res?.filename ?? "minified.gz"}</p>
        </div>
      }
      onDownload={download}
      onClear={clear}
      downloadLabel="Download .gz"
      warning={
        <div className="flex items-start gap-2 rounded-md bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Minified (comments/whitespace stripped) then gzipped for maximum
            compression. Decompress with <code>gunzip</code> or any gzip tool.
          </span>
        </div>
      }
    />
  );
}
