import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlobalMonitor from "@/components/layout/GlobalMonitor";

export const metadata: Metadata = {
  title: "VEILZERO — Be seen. Not identified.",
  description:
    "Browser-based anti-surveillance toolkit. Cloak your face, distort your voice and strip file metadata. Everything runs on your device.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "VEILZERO",
    description: "Be seen. Not identified.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-bg text-text font-body animate-crt-flicker">
        {/* Global CRT Scanlines */}
        <div className="scanlines pointer-events-none fixed inset-0 z-40 opacity-20 mix-blend-overlay" />

        <Navbar />
        <main className="flex-1 relative z-10">{children}</main>
        <Footer />

        {/* The Zero-Trust HUD */}
        <GlobalMonitor />
      </body>
    </html>
  );
}