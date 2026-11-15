"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMime } from "@/lib/fileUtils";
import { RECORD_FPS } from "@/lib/constants";
import type { RecordingResult } from "@/types/stream";

/**
 * Records the *processed* canvas + processed audio. The raw camera and raw mic
 * tracks are never given to MediaRecorder.
 */
export function useRecorder(canvasRef: React.RefObject<HTMLCanvasElement>, audio: MediaStream | null) {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState(false);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const out = canvas.captureStream(RECORD_FPS);
      audio?.getAudioTracks().forEach((t) => out.addTrack(t));
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const type = rec.mimeType || "video/webm";
        const blob = new Blob(chunks.current, { type });
        setResult({
          blob,
          url: URL.createObjectURL(blob),
          mimeType: type,
          durationMs: performance.now() - startedAt.current,
        });
        setRecording(false);
      };
      rec.start(250);
      startedAt.current = performance.now();
      recorder.current = rec;
      setResult(null);
      setError(false);
      setRecording(true);
    } catch {
      setError(true);
    }
  }, [canvasRef, audio]);

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }, []);

  const discard = useCallback(() => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
  }, [result]);

  useEffect(
    () => () => {
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    },
    []
  );

  return { recording, result, error, start, stop, discard };
}
