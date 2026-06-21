"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, FileText } from "lucide-react";

export type LegalKind = "privacy" | "terms";

const LAST_UPDATED = "June 2025";

const PRIVACY = {
  title: "Privacy Policy",
  icon: ShieldCheck,
  body: (
    <>
      <p>
        Your privacy is the whole point of ShrinkRay. This page explains exactly
        what happens when you use the tool.
      </p>

      <h3>We don&apos;t see your files. Ever.</h3>
      <p>
        ShrinkRay runs entirely in your web browser. All compression — images,
        video, audio, and PDFs — is performed locally on your device using
        browser APIs (Canvas, MediaRecorder, Web Audio, and PDF rendering). Your
        files are <strong>never uploaded to any server</strong>, never stored,
        and never transmitted across the network.
      </p>

      <h3>No accounts, no tracking identifiers</h3>
      <p>
        ShrinkRay does not require sign-up and does not use accounts. We do not
        set cookies that identify you. We do not collect your name, email, IP
        address, or any personal information.
      </p>

      <h3>What stays on your device</h3>
      <ul>
        <li>The files you select for compression.</li>
        <li>The compressed output you choose to download.</li>
      </ul>
      <p>
        Closing the tab or clicking &ldquo;Remove&rdquo;/&ldquo;Clear&rdquo;
        discards everything from memory. Nothing is written to disk by
        ShrinkRay itself beyond the files you explicitly download.
      </p>

      <h3>Analytics</h3>
      <p>
        ShrinkRay does not include third-party analytics or advertising
        trackers. If the site is hosted on a platform (such as Vercel) that
        records aggregated, anonymous infrastructure metrics (e.g. request
        counts), those metrics do not include your files or file contents.
      </p>

      <h3>Children&apos;s privacy</h3>
      <p>
        ShrinkRay is a general-purpose utility and does not knowingly collect
        any data from anyone, including children.
      </p>

      <h3>Changes to this policy</h3>
      <p>
        If we ever change how ShrinkRay handles data, we will update this page.
        Because the tool is serverless by design, the core promise — files
        never leave your browser — will not change.
      </p>

      <h3>Contact</h3>
      <p>
        ShrinkRay is an open-source project. For questions about this policy,
        please open an issue on the project&apos;s GitHub repository.
      </p>
    </>
  ),
};

const TERMS = {
  title: "Terms of Service",
  icon: FileText,
  body: (
    <>
      <p>
        By using ShrinkRay, you agree to these simple terms. They&apos;re short
        on purpose.
      </p>

      <h3>The service</h3>
      <p>
        ShrinkRay is a free, browser-based utility for compressing images,
        video, audio, and PDF files. It is provided &ldquo;as is&rdquo; and
        &ldquo;as available&rdquo;, without warranties of any kind — express or
        implied — including warranties of merchantability or fitness for a
        particular purpose.
      </p>

      <h3>Your content, your responsibility</h3>
      <p>
        You are responsible for the files you process. Because all processing
        happens on your device, you retain full ownership and control of your
        content at all times. You agree that you have the rights to compress and
        download the files you use with the tool.
      </p>

      <h3>Acceptable use</h3>
      <ul>
        <li>Don&apos;t use ShrinkRay to process files you don&apos;t have the right to use.</li>
        <li>Don&apos;t attempt to abuse, overload, or reverse-engineer the hosting infrastructure.</li>
        <li>Don&apos;t use the tool for any unlawful purpose.</li>
      </ul>

      <h3>Free and open</h3>
      <p>
        ShrinkRay is free to use. There are no paid tiers, no watermarks, no
        usage limits imposed by the tool itself. The source code is available on
        GitHub and you are welcome to inspect, fork, or self-host it.
      </p>

      <h3>Limitation of liability</h3>
      <p>
        To the maximum extent permitted by law, the authors and maintainers of
        ShrinkRay shall not be liable for any indirect, incidental, special, or
        consequential damages arising from your use of the tool, including loss
        of data. Always keep backups of your original files.
      </p>

      <h3>Third-party libraries</h3>
      <p>
        ShrinkRay is built on open-source libraries (including pdf-lib,
        pdfjs-dist, and lamejs). Each is governed by its own license.
      </p>

      <h3>Changes</h3>
      <p>
        These terms may be updated from time to time. Continued use of ShrinkRay
        after a change constitutes acceptance of the updated terms.
      </p>
    </>
  ),
};

export function LegalDialog({
  kind,
  open,
  onOpenChange,
}: {
  kind: LegalKind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const content = kind === "privacy" ? PRIVACY : TERMS;
  const Icon = content.icon;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Icon className="h-5 w-5 text-emerald-500" />
            {content.title}
          </DialogTitle>
          <DialogDescription>Last updated: {LAST_UPDATED}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <div className="legal-prose space-y-4 px-6 py-5 text-sm leading-relaxed text-muted-foreground">
            {content.body}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
