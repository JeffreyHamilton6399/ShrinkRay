"use client";

import * as React from "react";
import {
  Download,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { formatBytes, savedPercent, shortFileName } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CompressStatus = "processing" | "done" | "error";

interface ResultCardProps {
  fileName: string;
  originalSize: number;
  status: CompressStatus;
  resultSize?: number;
  error?: string;
  progress?: number;
  progressLabel?: string;
  preview?: React.ReactNode;
  meta?: React.ReactNode;
  onDownload: () => void;
  onClear: () => void;
  downloadLabel?: string;
  controls?: React.ReactNode;
  warning?: React.ReactNode;
}

export function ResultCard({
  fileName,
  originalSize,
  status,
  resultSize,
  error,
  progress = 0,
  progressLabel,
  preview,
  meta,
  onDownload,
  onClear,
  downloadLabel = "Download",
  controls,
  warning,
}: ResultCardProps) {
  const pct = resultSize ? savedPercent(originalSize, resultSize) : 0;
  const grew = resultSize ? resultSize > originalSize : false;

  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="flex flex-1 flex-col overflow-hidden p-4">
        {status === "processing" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">{progressLabel ?? "Working…"}</p>
            {progress > 0 && (
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-1.5" />
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {progress}%
                </p>
              </div>
            )}
          </div>
        ) : status === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="max-w-sm text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span
                  className="truncate text-sm font-medium"
                  title={fileName}
                >
                  {shortFileName(fileName, 40)}
                </span>
              </div>
              {resultSize ? (
                <Badge
                  className={cn(
                    "shrink-0",
                    grew
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-500 text-white"
                  )}
                >
                  {grew ? `+${Math.abs(100 - pct)}%` : `−${pct}%`}
                </Badge>
              ) : null}
            </div>

            {preview && (
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-2">
                {preview}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 text-sm tabular-nums">
                <span className="text-muted-foreground line-through">
                  {formatBytes(originalSize)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span
                  className={cn(
                    "font-semibold",
                    grew ? "text-amber-600" : "text-emerald-600"
                  )}
                >
                  {resultSize ? formatBytes(resultSize) : "…"}
                </span>
                {meta && (
                  <span className="text-xs text-muted-foreground">· {meta}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onDownload} disabled={!resultSize}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {downloadLabel}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={onClear}
                  title="New file"
                  aria-label="New file"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {warning}
          </div>
        )}
      </Card>
      {controls && <div className="shrink-0">{controls}</div>}
    </div>
  );
}
