"use client";

import * as React from "react";
import {
  Download,
  Plus,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { formatBytes, savedPercent, shortFileName } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CompressStatus = "idle" | "processing" | "done" | "error";

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
  const hasResult = resultSize != null;
  const pct = hasResult ? savedPercent(originalSize, resultSize!) : 0;
  const grew = hasResult ? resultSize! > originalSize : false;

  // Defensive: if status is "done" but we have no result, show an error
  const effectiveStatus =
    status === "done" && !hasResult ? "error" : status;
  const effectiveError =
    status === "done" && !hasResult
      ? "Compression produced no result. Try again or use a smaller file."
      : error;

  return (
    <div className="flex h-full flex-col gap-2">
      <Card className="flex flex-1 flex-col overflow-hidden p-3">
        {effectiveStatus === "processing" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-5 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {progressLabel ?? "Working…"}
            </p>
            {progress > 0 ? (
              <div className="w-full max-w-[240px]">
                <Progress value={progress} className="h-1.5" />
              </div>
            ) : null}
          </div>
        ) : effectiveStatus === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-5 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="max-w-sm text-sm text-destructive">{effectiveError}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                {effectiveStatus === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className="truncate text-sm font-medium"
                  title={fileName}
                >
                  {shortFileName(fileName, 40)}
                </span>
              </div>
              {hasResult ? (
                <Badge
                  className={cn(
                    "shrink-0 text-[11px]",
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
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/40 p-1.5">
                {preview}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5 text-sm tabular-nums">
                {hasResult ? (
                  <>
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
                      {formatBytes(resultSize!)}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {formatBytes(originalSize)}
                  </span>
                )}
                {meta && (
                  <span className="text-xs text-muted-foreground">· {meta}</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={onDownload} disabled={!hasResult}>
                  <Download className="mr-1 h-3.5 w-3.5" />
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
