"use client";

import * as React from "react";
import { ResultCard } from "@/components/result-card";
import { compressSvg } from "@/lib/compress-svg";

interface Result {
  blob: Blob;
  url: string;
  size: number;
}

interface Props {
  file: File;
  onClear: () => void;
}

export function SvgCompressor({ file, onClear }: Props) {
  const [result, setResult] = React.useState<Result | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await compressSvg(file);
        if (cancelled) {
          URL.revokeObjectURL(r.url);
          return;
        }
        setResult({ blob: r.blob, url: r.url, size: r.size });
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
      if (result) URL.revokeObjectURL(result.url);
    },
    [result]
  );

  const clear = () => {
    if (result) URL.revokeObjectURL(result.url);
    onClear();
  };

  const download = () => {
    if (!result) return;
    const base = file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${base}_minified.svg`;
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
      progressLabel="Minifying SVG…"
      preview={
        <img
          src={status === "done" && result ? result.url : URL.createObjectURL(file)}
          alt="SVG preview"
          className="max-h-44 max-w-full rounded-md bg-white p-2 object-contain"
        />
      }
      meta="minified"
      onDownload={download}
      onClear={clear}
      downloadLabel="Download SVG"
    />
  );
}
