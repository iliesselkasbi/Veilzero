"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Landmarks = { x: number; y: number; z?: number }[];

type FaceMeshInstance = {
  setOptions: (opts: Record<string, unknown>) => void;
  onResults: (cb: (r: { multiFaceLandmarks?: Landmarks[] }) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
};

type FaceMeshCtor = new (config: {
  locateFile: (file: string) => string;
}) => FaceMeshInstance;

declare global {
  interface Window {
    FaceMesh?: FaceMeshCtor;
  }
}

const SCRIPT_SRC = "/mediapipe/face_mesh.js";

function loadFaceMeshScript(): Promise<FaceMeshCtor> {
  if (typeof window !== "undefined" && window.FaceMesh) {
    return Promise.resolve(window.FaceMesh);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-veilzero="face-mesh"]`
    );

    const done = () => {
      if (window.FaceMesh) resolve(window.FaceMesh);
      else reject(new Error("FaceMesh global missing after script load"));
    };

    if (existing) {
      if (window.FaceMesh) done();
      else existing.addEventListener("load", done, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${SCRIPT_SRC}`)),
        { once: true }
      );
      return;
    }

    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.dataset.veilzero = "face-mesh";
    s.onload = () => done();
    s.onerror = () => {
      s.remove();
      reject(new Error(`Failed to load ${SCRIPT_SRC}`));
    };
    document.head.appendChild(s);
  });
}

/**
 * MediaPipe FaceMesh on a <video>. Model + wasm load from /public/mediapipe
 * (offline / blackout safe). No webpack dynamic import — avoids ChunkLoadError.
 *
 * `faces` / `lastSeen` are refs so the draw loop can read them without re-renders.
 */
export function useFaceMesh(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const faces = useRef<Landmarks[]>([]);
  const triangleIndices = useRef<number[]>([]);
  const lastSeen = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const meshRef = useRef<FaceMeshInstance | null>(null);
  const rafRef = useRef<number>(0);

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      meshRef.current?.close?.();
    } catch {
      /* ignore */
    }
    meshRef.current = null;
    faces.current = [];
    triangleIndices.current = [];
    setReady(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      teardown();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setInitError(null);
        const FaceMesh = await loadFaceMeshScript();
        if (cancelled) return;

        const { FACEMESH_TESSELATION } = await import("@mediapipe/face_mesh");
        const indices: number[] = [];
        for (let i = 0; i + 2 < FACEMESH_TESSELATION.length; i += 3) {
          const [a, b] = FACEMESH_TESSELATION[i];
          const [nextB, c] = FACEMESH_TESSELATION[i + 1];
          const [nextC, nextA] = FACEMESH_TESSELATION[i + 2];
          if (b === nextB && c === nextC && a === nextA) {
            indices.push(a, b, c);
          }
        }
        if (cancelled) return;
        triangleIndices.current = indices;

        const mesh = new FaceMesh({
          // Files copied from node_modules/@mediapipe/face_mesh → public/mediapipe/
          locateFile: (file: string) => `/mediapipe/${file}`,
        });

        mesh.setOptions({
          maxNumFaces: 4,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        mesh.onResults((r) => {
          const list: Landmarks[] = r.multiFaceLandmarks ?? [];
          faces.current = list;
          if (list.length) lastSeen.current = performance.now();
        });

        meshRef.current = mesh;
        if (!cancelled) setReady(true);

        let busy = false;
        let frameIndex = 0;
        const tick = async () => {
          if (cancelled) return;
          frameIndex++;
          const lowPower = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
          if (lowPower && frameIndex % 2 !== 0) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          const v = videoRef.current;
          if (v && v.readyState >= 2 && !busy && meshRef.current) {
            busy = true;
            try {
              await meshRef.current.send({ image: v });
            } catch {
              /* skip frame */
            }
            busy = false;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "FaceMesh failed to init";
          setInitError(msg);
          setReady(false);
          console.error("[VEILZERO] FaceMesh:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [enabled, videoRef, teardown]);

  return { faces, triangleIndices, lastSeen, ready, initError };
}