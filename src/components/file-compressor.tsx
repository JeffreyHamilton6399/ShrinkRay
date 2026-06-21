"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileArchive, Info } from "lucide-react";
import { ResultCard } from "@/components/result-card";
import {
  compressFile,
  isLikelyIncompressible,
  type CompressedArchive,
} from "@/lib/compress-file";

interface Props {
  file: File;
  onClear: () => void;
}

export function FileCompressor({ file, onClear }: Props) {
  const [res, setRes] = React.useState<CompressedArchive | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [error, setError] = React.useState<string | null>(null);
  const wasIncompressible = React.useMemo(
    () => isLikelyIncompressible(file),
    [file]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await compressFile(file);
        if (cancelled) {
          URL.revokeObjectURL(r.url);
          return;
        }
        setRes(r);
        setStatus("done");
        if (r.size >= file.size) {
          toast.info("This file is already well-compressed — zip barely helped.");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Compression failed");
        setStatus("error");
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

  const grew = res ? res.size >= file.size : false;

  return (
    <ResultCard
      fileName={file.name}
      originalSize={file.size}
      status={status}
      resultSize={res?.size}
      error={error ?? undefined}
      preview={
        <div className="flex flex-col items-center gap-2 py-2 text-muted-foreground">
          <FileArchive className="h-12 w-12 text-emerald-500" />
          <p className="text-xs">→ {res?.filename ?? "compressed.zip"}</p>
        </div>
      }
      onDownload={download}
      onClear={clear}
      downloadLabel="Download ZIP"
      warning={
        wasIncompressible && res && grew ? (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This file type is already compressed (media, archives, office
              docs, etc.), so zipping can&apos;t shrink it further. For images,
              video, audio, and PDFs, those are handled automatically when you
              drop them.
            </span>
          </div>
        ) : null
      }
    />
  );
}
