"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("VEILZERO service worker registration failed.", error);
    });
  }, []);

  return null;
}