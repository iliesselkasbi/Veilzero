"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeRecordingBlob, pickRecorderMime } from "@/lib/fileUtils";
import { RECORD_FPS } from "@/lib/constants";
import { createTrackedObjectUrl, revokeTrackedObjectUrl } from "@/lib/burn";
import type { RecordingResult } from "@/types/stream";

const MAX_RECORDING_BYTES = 256 * 1024 * 1024;

/**
 * Records the *processed* canvas + processed audio. The raw camera and raw mic
 * tracks are never given to MediaRecorder.
 */
export function useRecorder(canvasRef: React.RefObject<HTMLCanvasElement | null>, audio: MediaStream | null) {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const chunkBytes = useRef(0);
  const outputStream = useRef<MediaStream | null>(null);
  const resultRef = useRef<RecordingResult | null>(null);
  const maxDuration = useRef<number | null>(null);
  const startedAt = useRef(0);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mounted = useRef(true);
  const overSizeLimit = useRef(false);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const out = canvas.captureStream(RECORD_FPS);
      outputStream.current = out;
      audio?.getAudioTracks().forEach((track) => out.addTrack(track.clone()));
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
      chunks.current = [];
      chunkBytes.current = 0;
      overSizeLimit.current = false;
      rec.ondataavailable = (e) => {
        if (!e.data.size || overSizeLimit.current) return;
        chunkBytes.current += e.data.size;
        if (chunkBytes.current > MAX_RECORDING_BYTES) {
          overSizeLimit.current = true;
          if (rec.state !== "inactive") rec.stop();
          return;
        }
        chunks.current.push(e.data);
      };
      rec.onerror = () => {
        if (mounted.current) {
          setError(true);
          setErrorMessage("Recording failed.");
        }
      };
      rec.onstop = () => {
        if (maxDuration.current !== null) {
          window.clearTimeout(maxDuration.current);
          maxDuration.current = null;
        }
        outputStream.current?.getTracks().forEach((t) => t.stop());
        outputStream.current = null;
        if (mounted.current) {
          if (overSizeLimit.current) {
            setError(true);
            setErrorMessage("Recording stopped because it exceeded the 256 MB size limit.");
          } else {
            const type = rec.mimeType || "video/webm";
            const rawBlob = new Blob(chunks.current, { type });
            void normalizeRecordingBlob(rawBlob).then((blob) => {
              if (!mounted.current) return;
              const nextResult = {
                blob,
                url: createTrackedObjectUrl(blob),
                mimeType: type,
                durationMs: performance.now() - startedAt.current,
              };
              resultRef.current = nextResult;
              setResult(nextResult);
            });
          }
          setRecording(false);
        }
        chunks.current = [];
        chunkBytes.current = 0;
      };
      rec.start(250);
      maxDuration.current = window.setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, 10 * 60 * 1000);
      startedAt.current = performance.now();
      recorder.current = rec;
      if (resultRef.current) revokeTrackedObjectUrl(resultRef.current.url);
      resultRef.current = null;
      setResult(null);
      setError(false);
      setErrorMessage(null);
      setRecording(true);
    } catch {
      outputStream.current?.getTracks().forEach((track) => track.stop());
      outputStream.current = null;
      if (mounted.current) {
        setError(true);
        setErrorMessage("Recording could not be started.");
      }
    }
  }, [canvasRef, audio]);

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }, []);

  const discard = useCallback(() => {
    if (resultRef.current) revokeTrackedObjectUrl(resultRef.current.url);
    resultRef.current = null;
    setResult(null);
  }, []);

  useEffect(
    () => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
        if (resultRef.current) revokeTrackedObjectUrl(resultRef.current.url);
        resultRef.current = null;
      };
    },
    []
  );

  useEffect(
    () => () => {
      if (maxDuration.current !== null) window.clearTimeout(maxDuration.current);
    },
    []
  );

  return { recording, result, error, errorMessage, start, stop, discard };
}
