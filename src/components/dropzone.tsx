"use client";

import * as React from "react";
import {
  UploadCloud,
  ImageIcon,
  Film,
  Music,
  FileText,
  FileArchive,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DropIcon = "image" | "video" | "audio" | "pdf" | "file";

interface DropzoneProps {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  subtitle: string;
  icon?: DropIcon;
  className?: string;
}

const ICONS: Record<DropIcon, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  pdf: FileText,
  file: FileArchive,
};

export function Dropzone({
  accept,
  multiple = false,
  onFiles,
  title,
  subtitle,
  icon = "file",
  className,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Paste support
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) onFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  const Icon = ICONS[icon];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition-all duration-200",
        "hover:border-foreground/40 hover:bg-muted/50",
        dragging && "border-foreground/60 bg-muted scale-[1.005]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Icon className="mb-2 h-7 w-7 text-muted-foreground transition-colors group-hover:text-foreground" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{subtitle}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
        <UploadCloud className="h-3 w-3" />
        or paste from clipboard
      </p>
    </div>
  );
}
