"use client";

import * as React from "react";
import { Dropzone } from "@/components/dropzone";
import { ImageCompressor } from "@/components/image-compressor";
import { VideoCompressor } from "@/components/video-compressor";
import { AudioCompressor } from "@/components/audio-compressor";
import { PdfCompressor } from "@/components/pdf-compressor";
import { FileCompressor } from "@/components/file-compressor";
import { detectKind, type MediaKind } from "@/lib/detect";

interface Dropped {
  file: File;
  kind: MediaKind;
}

export function Compressor() {
  const [dropped, setDropped] = React.useState<Dropped | null>(null);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setDropped({ file, kind: detectKind(file) });
  };

  const clear = () => setDropped(null);

  if (!dropped) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Dropzone
          accept="*/*"
          onFiles={handleFiles}
          title="Drop a file"
          subtitle="Image, video, audio, PDF, or anything else — auto-detected and compressed in your browser"
          icon="file"
          className="max-w-lg"
        />
      </div>
    );
  }

  const { file, kind } = dropped;
  const key = `${kind}-${file.name}-${file.size}-${file.lastModified}`;

  switch (kind) {
    case "image":
      return <ImageCompressor key={key} file={file} onClear={clear} />;
    case "video":
      return <VideoCompressor key={key} file={file} onClear={clear} />;
    case "audio":
      return <AudioCompressor key={key} file={file} onClear={clear} />;
    case "pdf":
      return <PdfCompressor key={key} file={file} onClear={clear} />;
    default:
      return <FileCompressor key={key} file={file} onClear={clear} />;
  }
}
