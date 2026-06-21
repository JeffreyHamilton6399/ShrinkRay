import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShrinkRay — Free Online Image, Video, Audio & PDF Compressor",
  description: "Shrink images, video, audio, and PDFs right in your browser. 100% free, no sign-up, no uploads, no watermarks. Your files never leave your device.",
  keywords: ["image compressor", "video compressor", "mp3 compressor", "pdf compressor", "free compressor", "browser", "privacy", "no upload"],
  authors: [{ name: "ShrinkRay" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "ShrinkRay — Free Browser Media Compressor",
    description: "Shrink images, video, audio & PDFs privately in your browser. No sign-up, no uploads, no watermarks.",
    url: "https://shrinkray.app",
    siteName: "ShrinkRay",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShrinkRay — Free Browser Media Compressor",
    description: "Shrink images, video, audio & PDFs privately in your browser.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
