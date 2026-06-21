"use client";

import * as React from "react";
import { Plus, Trash2, Loader2, AlertCircle, Download, ArrowLeft, Package, Image as ImageIcon, Film, Music, FileText, FileArchive, FileCode, Box } from "lucide-react";
import { Dropzone } from "@/components/dropzone";
import { ImageCompressor } from "@/components/image-compressor";
import { VideoCompressor } from "@/components/video-compressor";
import { AudioCompressor } from "@/components/audio-compressor";
import { PdfCompressor } from "@/components/pdf-compressor";
import { FileCompressor } from "@/components/file-compressor";
import { SvgCompressor } from "@/components/svg-compressor";
import { Model3DCompressor } from "@/components/model-3d-compressor";
import { TextCompressor } from "@/components/text-compressor";
import { detectKindAsync, type MediaKind } from "@/lib/detect";
import { formatBytes, savedPercent, shortFileName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DroppedFile {
  id: string;
  file: File;
  kind: MediaKind;
}

export function Compressor() {
  const [files, setFiles] = React.useState<DroppedFile[]>([]);
  const [showDrop, setShowDrop] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const handleFiles = async (dropped: File[]) => {
    const next: DroppedFile[] = await Promise.all(
      dropped.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind: await detectKindAsync(file),
      }))
    );
    setFiles((prev) => [...prev, ...next]);
    setShowDrop(false);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length === 0) {
        setShowDrop(true);
        setSelectedId(null);
      }
      if (selectedId === id) setSelectedId(null);
      return filtered;
    });
  };

  const clearAll = () => {
    setFiles([]);
    setShowDrop(true);
    setSelectedId(null);
  };

  // Helper: go back to the right view
  const goBack = () => {
    setSelectedId(null);
    setShowDrop(false); // show list (or single file view)
  };

  // --- Dropzone view (initial or "add more") ---
  if (showDrop) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        {files.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {files.length} file{files.length > 1 ? "s" : ""} ready · drop more to add
            </p>
            <Button size="sm" variant="ghost" onClick={() => setShowDrop(false)} className="text-muted-foreground">
              Done adding
            </Button>
          </div>
        )}
        <div className="flex flex-1 items-center justify-center">
          <Dropzone
            accept="*/*"
            multiple
            onFiles={handleFiles}
            title={files.length > 0 ? "Drop more files" : "Drop files"}
            subtitle="One or many — images, video, audio, PDFs, 3D models, or anything else. Auto-detected and compressed in your browser."
            icon="file"
            className="max-w-lg"
          />
        </div>
      </div>
    );
  }

  // --- A file is selected from the list → show full controls ---
  const selected = files.find((f) => f.id === selectedId);
  if (selected) {
    const { file, kind } = selected;
    const key = `${kind}-${file.name}-${file.size}-${file.lastModified}`;
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={goBack}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to list
          </Button>
        </div>
        {renderCompressor(kind, file, key, () => removeFile(selected.id))}
      </div>
    );
  }

  // --- Single file → full UI with controls (ResultCard has its own New button) ---
  if (files.length === 1) {
    const { file, kind } = files[0];
    const key = `${kind}-${file.name}-${file.size}-${file.lastModified}`;
    return (
      <div className="flex h-full flex-col gap-3">
        {renderCompressor(kind, file, key, clearAll)}
      </div>
    );
  }

  // --- Multiple files → list view ---
  const downloadAll = async () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      '[data-download-btn="true"]'
    );
    for (const btn of buttons) {
      btn.click();
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {files.length} files · click any to adjust settings
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={downloadAll}>
            <Package className="mr-1.5 h-3.5 w-3.5" />
            Download all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDrop(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={clearAll} className="text-muted-foreground">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>
      <div className="max-h-[calc(100dvh-180px)] space-y-2 overflow-y-auto pr-1">
        {files.map((item) => (
          <FileRow
            key={item.id}
            item={item}
            onRemove={() => removeFile(item.id)}
            onClick={() => setSelectedId(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// --- Render the right compressor for a file kind ---
function renderCompressor(
  kind: MediaKind,
  file: File,
  key: string,
  onClear: () => void
) {
  switch (kind) {
    case "image":
      return <ImageCompressor key={key} file={file} onClear={onClear} />;
    case "video":
      return <VideoCompressor key={key} file={file} onClear={onClear} />;
    case "audio":
      return <AudioCompressor key={key} file={file} onClear={onClear} />;
    case "pdf":
      return <PdfCompressor key={key} file={file} onClear={onClear} />;
    case "svg":
      return <SvgCompressor key={key} file={file} onClear={onClear} />;
    case "3d":
      return <Model3DCompressor key={key} file={file} onClear={onClear} />;
    case "text":
      return <TextCompressor key={key} file={file} onClear={onClear} />;
    default:
      return <FileCompressor key={key} file={file} onClear={onClear} />;
  }
}

// --- Inline mini compressor for multi-file list ---

interface MiniResult {
  blob: Blob;
  url: string;
  size: number;
}

// Simple concurrency limiter — only 2 files compress at a time.
const CONCURRENCY = 2;
let activeCount = 0;
const queue: (() => void)[] = [];

async function withConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  if (activeCount >= CONCURRENCY) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  activeCount++;
  try {
    return await fn();
  } finally {
    activeCount--;
    const next = queue.shift();
    if (next) next();
  }
}

function FileRow({
  item,
  onRemove,
  onClick,
}: {
  item: DroppedFile;
  onRemove: () => void;
  onClick: () => void;
}) {
  const [result, setResult] = React.useState<MiniResult | null>(null);
  const [status, setStatus] = React.useState<"processing" | "done" | "error">("processing");
  const [error, setError] = React.useState<string | null>(null);
  const urlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await withConcurrency(() => compressMini(item.file, item.kind));
        if (cancelled) {
          URL.revokeObjectURL(r.url);
          return;
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = r.url;
        setResult(r);
        setStatus("done");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [item]);

  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    const base = item.file.name.replace(/\.[^.]+$/, "");
    a.download = `${base}_compressed.${extFor(result.blob, item.file.name)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  const pct = result ? savedPercent(item.file.size, result.size) : 0;
  const grew = pct < 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <KindIcon kind={item.kind} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {shortFileName(item.file.name, 35)}
        </p>
        <div className="flex items-center gap-2 text-xs tabular-nums">
          {status === "processing" ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Compressing…
            </span>
          ) : status === "error" ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {error ?? "Failed"}
            </span>
          ) : result ? (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground line-through">
                {formatBytes(item.file.size)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className={cn("font-semibold", grew ? "text-amber-600" : "text-emerald-600")}>
                {formatBytes(result.size)}
              </span>
              <Badge className={cn("h-4 px-1 text-[10px]", grew ? "bg-amber-500 text-white" : "bg-emerald-500 text-white")}>
                {grew ? `+${Math.abs(pct)}%` : `−${pct}%`}
              </Badge>
            </span>
          ) : null}
        </div>
      </div>
      {status === "done" && result && (
        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={download} data-download-btn="true">
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={remove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function KindIcon({ kind }: { kind: MediaKind }) {
  const icons: Record<MediaKind, React.ComponentType<{ className?: string }>> = {
    image: ImageIcon,
    video: Film,
    audio: Music,
    pdf: FileText,
    svg: FileCode,
    "3d": Box,
    text: FileCode,
    file: FileArchive,
  };
  const Icon = icons[kind];
  return <Icon className="h-4 w-4 text-muted-foreground" />;
}

function extFor(blob: Blob, fileName?: string): string {
  const t = blob.type.toLowerCase();
  // Match by blob type
  if (t.includes("gzip")) return "gz";
  if (t.includes("zip")) return "zip";
  if (t.includes("pdf")) return "pdf";
  if (t.includes("mp3") || t.includes("mpeg")) return "mp3";
  if (t.includes("mp4")) return "mp4";
  if (t.includes("webm")) return "webm";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  if (t.includes("png")) return "png";
  if (t.includes("svg")) return "svg";
  if (t.includes("avif")) return "avif";
  if (t.includes("gltf-binary")) return "glb";
  if (t.includes("gltf")) return "gltf";
  if (t.includes("model/stl")) return "stl";
  if (t.includes("model/ply")) return "ply";
  if (t.includes("model/obj")) return "obj";
  if (t.includes("text/plain")) return "txt";
  if (t.includes("text/html")) return "html";
  if (t.includes("text/css")) return "css";
  if (t.includes("javascript")) return "js";
  if (t.includes("json")) return "json";
  if (t.includes("xml")) return "xml";
  // Fallback: try to get extension from original filename
  if (fileName) {
    const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
    if (ext) return ext;
  }
  return "bin";
}

// --- Mini compression (default settings for batch mode) ---

async function compressMini(file: File, kind: MediaKind): Promise<MiniResult> {
  if (kind === "image") {
    const { compressImage } = await import("@/lib/compress-image");
    const r = await compressImage(file, {
      quality: 0.6,
      maxWidth: 1920,
      maxHeight: 1920,
      format: "image/webp",
      background: "#ffffff",
    });
    return { blob: r.blob, url: r.url, size: r.blob.size };
  }
  if (kind === "file") {
    const { compressFile } = await import("@/lib/compress-file");
    const r = await compressFile(file);
    return { blob: r.blob, url: r.url, size: r.size };
  }
  if (kind === "svg") {
    const { compressSvg } = await import("@/lib/compress-svg");
    const r = await compressSvg(file);
    return { blob: r.blob, url: r.url, size: r.size };
  }
  if (kind === "3d") {
    const { compress3DModel } = await import("@/lib/compress-3d");
    const r = await compress3DModel(file);
    return { blob: r.blob, url: r.url, size: r.size };
  }
  if (kind === "text") {
    const { compressTextFile } = await import("@/lib/compress-text");
    const r = await compressTextFile(file);
    return { blob: r.blob, url: r.url, size: r.size };
  }
  if (kind === "audio") {
    const { compressAudio } = await import("@/lib/compress-audio");
    const r = await compressAudio(file, { bitrateKbps: 96, channels: "auto" });
    return { blob: r.blob, url: r.url, size: r.blob.size };
  }
  if (kind === "pdf") {
    const { compressPdf } = await import("@/lib/compress-pdf");
    const r = await compressPdf(file, { quality: 35 });
    return { blob: r.blob, url: r.url, size: r.blob.size };
  }
  // video
  const { compressVideo } = await import("@/lib/compress-video");
  const meta = await getVideoMeta(file);
  const r = await compressVideo(
    file,
    { quality: 25, targetHeight: 144, format: "video/mp4" },
    meta
  );
  return { blob: r.blob, url: r.url, size: r.blob.size };
}

function getVideoMeta(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      const meta = { width: v.videoWidth, height: v.videoHeight, duration: v.duration };
      cleanup();
      resolve(meta);
    };
    v.onerror = () => {
      cleanup();
      reject(new Error("Could not read video"));
    };
    v.src = url;
  });
}
