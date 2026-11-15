"use client";

import { useEffect, useRef } from "react";
import { MASKS } from "@/config/masks";
import { loadImage } from "@/lib/canvasUtils";
import type { MaskId } from "@/types/stream";

/** Preloads every mask image once and exposes them through a stable ref for the render loop. */
export function useMaskImages() {
  const images = useRef<Partial<Record<MaskId, HTMLImageElement>>>({});
  useEffect(() => {
    let alive = true;
    MASKS.forEach(async (m) => {
      if (!m.src) return;
      try {
        const img = await loadImage(m.src);
        if (alive) images.current[m.id] = img;
      } catch {
        /* falls back to a solid fill in drawFrame */
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return images;
}
