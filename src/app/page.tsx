"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Compressor } from "@/components/compressor";
import { SettingsMenu } from "@/components/settings-menu";
import { TermsGate } from "@/components/terms-gate";
import { LogoMark } from "@/components/logo-mark";
import { preloadFFmpeg } from "@/lib/compress-video";
import { isLowMemoryDevice } from "@/lib/mobile";

const DONATE_URL = "https://buymeacoffee.com/jeffreyscof";

export default function Home() {
  // Pre-warm the ffmpeg engine in the background on desktop only.
  // On mobile, the 32MB download + parse freezes the browser.
  React.useEffect(() => {
    if (!isLowMemoryDevice()) {
      preloadFFmpeg();
    }
  }, []);

  return (
    <TermsGate>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
          <a href="/" className="flex items-center gap-1.5">
            <LogoMark className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold tracking-tight">ShrinkRay</span>
          </a>
          <div className="flex items-center gap-1.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 rounded-full border-rose-200 px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Buy me a coffee"
              >
                <Heart className="h-3.5 w-3.5" />
                <span className="ml-1 hidden sm:inline">Donate</span>
              </a>
            </Button>
            <SettingsMenu />
          </div>
        </header>

        {/* Main — fills remaining height, never scrolls */}
        <main className="flex min-h-0 flex-1 flex-col px-3 py-2">
          <Compressor />
        </main>

        {/* Footer */}
        <footer className="flex h-8 shrink-0 items-center justify-center border-t px-4 text-[11px] text-muted-foreground">
          V1 · Jeffrey Hamilton
        </footer>
      </div>
    </TermsGate>
  );
}
