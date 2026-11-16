import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlobalMonitor from "@/components/layout/GlobalMonitor";
import PWARegister from "@/components/layout/PWARegister";

export const metadata: Metadata = {
  title: "VEILZERO — Hollow Survival Suite",
  description: "Off-grid communications and truth verification.",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-bg text-text font-body animate-crt-flicker">
        <div className="scanlines pointer-events-none fixed inset-0 z-40 opacity-20 mix-blend-overlay" />
        <Navbar />
        <main className="flex-1 relative z-10">{children}</main>
        <Footer />
        <GlobalMonitor />
        <PWARegister />
      </body>
    </html>
  );
}