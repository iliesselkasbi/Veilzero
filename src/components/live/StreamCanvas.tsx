"use client";

import { useEffect, useRef } from "react";
import { drawFrame } from "@/lib/facemask";
import { FaceWarper } from "@/lib/faceWarp";
import type { MaskId } from "@/types/stream";
import { VIDEO_HEIGHT, VIDEO_WIDTH } from "@/lib/constants";

type Landmarks = { x: number; y: number; z?: number }[];

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faces: React.MutableRefObject<Landmarks[]>;
  triangleIndices: React.MutableRefObject<number[]>;
  lastSeen: React.MutableRefObject<number>;
  images: React.MutableRefObject<Partial<Record<MaskId, HTMLImageElement>>>;
  meshReady: boolean;
  active: boolean;
  mask: MaskId;
  onTrackingChange?: (tracking: boolean) => void;
}

/** Short grace only — resistance tools fail closed. */
const LOST_MS = 120;

export default function StreamCanvas({
  canvasRef,
  videoRef,
  faces,
  triangleIndices,
  lastSeen,
  images,
  meshReady,
  active,
  mask,
  onTrackingChange,
}: Props) {
  const everLocked = useRef(false);
  const warperRef = useRef<FaceWarper | null>(null);

  useEffect(() => {
    if (!active) {
      everLocked.current = false;
      warperRef.current?.dispose();
      warperRef.current = null;
      return;
    }
    let raf = 0;
    let lastTracking: boolean | null = null;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const paintKillswitch = (w: number, h: number, reason: string) => {
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff003c";
      ctx.font = "bold 44px monospace";
      const jitter = Math.random() * 3 - 1.5;
      ctx.fillText("TRACKING LOST", w / 2 + jitter, h / 2 - 28);
      ctx.fillStyle = "rgba(255,0,60,0.35)";
      ctx.fillText("TRACKING LOST", w / 2 - 2, h / 2 - 28);
      ctx.fillStyle = "#ff003c";
      ctx.font = "18px monospace";
      ctx.fillText("FEED SEVERED TO PROTECT IDENTITY", w / 2, h / 2 + 18);
      ctx.font = "14px monospace";
      ctx.fillText(`// ${reason}`, w / 2, h / 2 + 48);
    };

    const loop = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c && v.readyState >= 2) {
        const w = v.videoWidth || VIDEO_WIDTH;
        const h = v.videoHeight || VIDEO_HEIGHT;
        if (c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;

        const faceCount = faces.current?.length ?? 0;
        const recent = performance.now() - lastSeen.current < LOST_MS;
        const tracking =
          meshReady &&
          faceCount > 0 &&
          faceCount < 10 &&
          recent;

        if (tracking) everLocked.current = true;

        // Fail closed:
        // - before first lock
        // - whenever tracking drops
        if (!tracking) {
          paintKillswitch(
            w,
            h,
            !meshReady
              ? "MODEL NOT READY"
              : !everLocked.current
              ? "AWAITING FACE LOCK"
              : "KILLSWITCH ENGAGED"
          );
        } else {
          if (mask === "ghost" && !warperRef.current) {
            warperRef.current = new FaceWarper();
          }
          drawFrame({
            ctx,
            video: v,
            width: w,
            height: h,
            faces: faces.current,
            triangleIndices: triangleIndices.current,
            warper: warperRef.current,
            mask,
            images: images.current,
            failClosed: false,
          });
        }

        if (tracking !== lastTracking) {
          lastTracking = tracking;
          onTrackingChange?.(tracking);
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, mask, meshReady, canvasRef, videoRef, faces, triangleIndices, lastSeen, images, onTrackingChange]);

  useEffect(
    () => () => {
      warperRef.current?.dispose();
      warperRef.current = null;
    },
    []
  );

  return (
    <canvas
      ref={canvasRef}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      className="aspect-video w-full rounded-xl border border-border bg-black object-contain shadow-[0_0_20px_rgba(0,0,0,0.8)]"
    />
  );
}