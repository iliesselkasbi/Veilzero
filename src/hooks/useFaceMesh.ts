"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Landmarks = { x: number; y: number; z?: number }[];

/**
 * Runs MediaPipe FaceMesh on a <video> element. The model files are loaded
 * from the npm package's own assets (self-hosted via the CDN-free path below),
 * and all inference happens on-device.
 *
 * `faces` is a ref so the render loop can read it every frame without React re-renders.
 * `lastSeen` is the timestamp of the most recent frame that contained a face.
 */
export function useFaceMesh(videoRef: React.RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const faces = useRef<Landmarks[]>([]);
  const triangleIndices = useRef<number[]>([]);
  const lastSeen = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const meshRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    meshRef.current?.close?.();
    meshRef.current = null;
    faces.current = [];
    setReady(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      setInitError(null);
      try {
      const { FaceMesh, FACEMESH_TESSELATION } = await import("@mediapipe/face_mesh");
      if (cancelled) return;
      triangleIndices.current = [];
      for (let i = 0; i + 2 < FACEMESH_TESSELATION.length; i += 3) {
        const [a, b] = FACEMESH_TESSELATION[i];
        const [nextB, c] = FACEMESH_TESSELATION[i + 1];
        const [nextC, nextA] = FACEMESH_TESSELATION[i + 2];
        if (b === nextB && c === nextC && a === nextA) {
          triangleIndices.current.push(a, b, c);
        }
      }
      const mesh = new FaceMesh({
        // Self-hosted: copy node_modules/@mediapipe/face_mesh/* to /public/mediapipe/
        locateFile: (file: string) => `/mediapipe/${file}`,
      });
      mesh.setOptions({
        maxNumFaces: 10,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      mesh.onResults((r: any) => {
        const list: Landmarks[] = r.multiFaceLandmarks ?? [];
        faces.current = list;
        if (list.length) lastSeen.current = performance.now();
      });
      meshRef.current = mesh;
      setReady(true);

      let busy = false;
      const tick = async () => {
        const v = videoRef.current;
        if (v && v.readyState >= 2 && !busy) {
          busy = true;
          try {
            await mesh.send({ image: v });
          } catch {
            /* skip frame */
          }
          busy = false;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      } catch (error) {
        setInitError(error instanceof Error ? error.message : "FaceMesh initialization failed");
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [enabled, videoRef, teardown]);

  return { faces, triangleIndices, lastSeen, ready, initError };
}
