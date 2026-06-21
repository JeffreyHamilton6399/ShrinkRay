"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, Gift, Lock } from "lucide-react";

const STORAGE_KEY = "shrinkray-terms-accepted";

const points = [
  {
    icon: ShieldCheck,
    title: "Private by design",
    desc: "Your files are processed in your browser and never uploaded anywhere.",
  },
  {
    icon: FileText,
    title: "Your content, your responsibility",
    desc: "Only compress files you have the rights to use.",
  },
  {
    icon: Lock,
    title: "Provided as-is",
    desc: "No warranties — keep backups of anything important.",
  },
  {
    icon: Gift,
    title: "Free & no strings",
    desc: "No sign-up, no tracking, no watermarks. Ever.",
  },
];

export function TermsGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = React.useState(true);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    try {
      setAccepted(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setAccepted(false);
    }
    setChecked(true);
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setAccepted(true);
  };

  return (
    <>
      {children}
      <Dialog
        open={checked && !accepted}
        onOpenChange={() => {
          /* not dismissable */
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Before you shrink
            </DialogTitle>
            <DialogDescription className="text-center">
              A few quick things to know.
            </DialogDescription>
          </DialogHeader>

          <ul className="my-2 space-y-3">
            {points.map((p) => (
              <li key={p.title} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <p.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button onClick={accept} className="w-full">
            I accept — let&apos;s go
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            By continuing you agree to our Terms &amp; Privacy Policy (in the
            settings menu).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
