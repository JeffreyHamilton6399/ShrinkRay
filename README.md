# ShrinkRay

Compress images, video, audio, PDFs, and pretty much any file — right in your browser. No uploads, no sign-up, no watermarks. Free and open-source.

Drop a file in. ShrinkRay figures out what it is and shrinks it. Download the result. That's the whole thing.

## How it works

Everything runs locally in your browser using web APIs. Your files never touch a server.

| File type | What happens | Output |
| --- | --- | --- |
| Images (PNG, JPEG, WebP, GIF, BMP) | Re-encoded via Canvas at your chosen quality/resolution | JPEG / WebP / PNG |
| Video (MP4, WebM, MOV, MKV) | Re-encoded in real time via MediaRecorder at a lower bitrate/resolution | WebM / MP4 |
| Audio (MP3, WAV, OGG, M4A, FLAC) | Decoded via Web Audio, re-encoded to MP3 at your chosen bitrate | MP3 |
| PDF | Each page rendered to an image and re-assembled into a smaller PDF | PDF |
| Anything else | Zipped at max compression | ZIP |

A note on honesty: already-compressed formats (MP3s, JPEGs, MP4s, Office docs) can't be shrunk much more — that's just how compression works. ShrinkRay will tell you when a file didn't shrink and won't pretend otherwise.

## Features

- **Auto-detect** — one dropzone. Drop anything; it routes to the right compressor.
- **Private by design** — files are processed in your browser and never uploaded.
- **No sign-up** — no accounts, no tracking, no watermarks, no usage limits.
- **Live controls** — dial in quality, resolution, bitrate, and format with instant feedback.
- **Dark mode** — there if you want it.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- [`pdf-lib`](https://pdf-lib.js.org/) + [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) for PDFs
- [`@breezystack/lamejs`](https://github.com/Breezystack/lamejs) for MP3 encoding
- [`fflate`](https://github.com/101arrowz/fflate) for ZIP

## Run it locally

```bash
git clone https://github.com/JeffreyHamilton6399/ShrinkRay.git
cd ShrinkRay
bun install
bun run dev
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Import the repo into [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js**.
3. That's it — no environment variables needed (there's no backend).

> **One thing to know:** the PDF engine (`pdfjs-dist`) needs its worker script, which lives at `public/pdf.worker.min.mjs`. It's committed to the repo, so deploys just work. If you ever upgrade `pdfjs-dist` in `package.json`, re-copy the matching worker from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into `public/`.

## Self-hosting notes

There is no server component. You can host the built output on any static-friendly platform. The entire app is client-side.

## Privacy

Files never leave the user's device. There are no analytics, no advertising trackers, and no accounts. See the in-app Privacy Policy for the full statement.

## License

MIT — do what you want. A nod to the original is appreciated but not required.

---

Built by Jeffrey Hamilton. If ShrinkRay saved you some megabytes, [buy me a coffee](https://buymeacoffee.com/jeffreyscof).
