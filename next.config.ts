import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Cross-origin isolation enables SharedArrayBuffer, which lets ffmpeg.wasm
  // run multi-threaded — 2-4x faster video compression. The ffmpeg core files
  // are self-hosted in /public/ffmpeg/ (same-origin), so COEP doesn't block them.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
