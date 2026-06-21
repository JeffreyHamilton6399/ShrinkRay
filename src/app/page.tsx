"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Compressor } from "@/components/compressor";
import { SettingsMenu } from "@/components/settings-menu";
import { TermsGate } from "@/components/terms-gate";
import { LogoMark } from "@/components/logo-mark";
import { preloadFFmpeg } from "@/lib/compress-video";

const DONATE_URL = "https://buymeacoffee.com/jeffreyscof";

export default function Home() {
  // Pre-warm the ffmpeg engine in the background as soon as the page loads,
  // so it's ready by the time the user drops a video (saves ~3-4 seconds).
  React.useEffect(() => {
    preloadFFmpeg();
  }, []);

  return (
    <TermsGate>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <a href="/" className="flex items-center gap-2">
            <LogoMark className="h-6 w-6 text-foreground" />
            <span className="text-sm font-bold tracking-tight">ShrinkRay</span>
          </a>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Buy me a coffee"
              >
                <Heart className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Donate</span>
              </a>
            </Button>
            <SettingsMenu />
          </div>
        </header>

        {/* Main — fills remaining height, never scrolls */}
        <main className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <Compressor />
        </main>

        {/* Footer */}
        <footer className="flex h-9 shrink-0 items-center justify-center border-t px-4 text-xs text-muted-foreground">
          V1 · Jeffrey Hamilton
        </footer>
      </div>
    </TermsGate>
  );
}
