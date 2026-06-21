"use client";

import * as React from "react";
import { Box, Info, Loader2 } from "lucide-react";
import { ResultCard } from "@/components/result-card";
import {
  compress3DModel,
  getAvailableFormats,
  type ModelOutputFormat,
  type CompressedModel,
} from "@/lib/compress-3d";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FORMAT_LABELS: Record<ModelOutputFormat, string> = {
  glb: "GLB (binary, best for web)",
  gltf: "GLTF (text, editable)",
  fbx: "FBX → GLB (FBX export not available)",
  obj: "OBJ (Wavefront)",
  stl: "STL (3D printing)",
  ply: "PLY (polygon)",
  gzip: "Gzip (.gz, universal)",
};

interface Props {
  file: File;
  onClear: () => void;
}

export function Model3DCompressor({ file, onClear }: Props) {
  const [format, setFormat] = React.useState<ModelOutputFormat>("glb");
  const [res, setRes] = React.useState<CompressedModel | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">(
    "processing"
  );
  const [error, setError] = React.useState<string | null>(null);

  const availableFormats = React.useMemo(
    () => getAvailableFormats(file.name),
    [file.name]
  );

  React.useEffect(() => {
    let cancelled = false;
    setRes(null);
    setStatus("processing");
    setError(null);
    (async () => {
      try {
        const r = await compress3DModel(file, { format });
        if (cancelled) {
          URL.revokeObjectURL(r.url);
          return;
        }
        setRes(r);
        setStatus("done");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Conversion failed");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, format]);

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
          {status === "processing" ? (
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
          ) : (
            <Box className="h-12 w-12 text-emerald-500" />
          )}
          <p className="text-xs">→ {res?.filename ?? "converting…"}</p>
        </div>
      }
      onDownload={download}
      onClear={clear}
      downloadLabel="Download"
      controls={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Output format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ModelOutputFormat)}
            >
              <SelectTrigger className="h-8 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFormats.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      warning={
        <div className="flex items-start gap-2 rounded-md bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {format === "gzip"
              ? "Gzip compression works on any 3D format (30-80% smaller). Decompress with gunzip or load directly in Three.js/Babylon.js with gzip enabled."
              : "Converted via Three.js. GLB is the most efficient format for web — binary, self-contained, and widely supported. STL/OBJ/PLY/FBX all convert to GLB."}
          </span>
        </div>
      }
    />
  );
}
