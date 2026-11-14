"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Status } from "@/types/common";
import { VIDEO_HEIGHT, VIDEO_WIDTH } from "@/lib/constants";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [denied, setDenied] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const start = useCallback(async () => {
    setStatus("loading");
    setDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: VIDEO_WIDTH }, height: { ideal: VIDEO_HEIGHT }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = new MediaStream(stream.getVideoTracks());
        v.muted = true; // never play raw mic audio back
        await v.play();
      }
      setMicStream(new MediaStream(stream.getAudioTracks()));
      setStatus("active");
    } catch (e: any) {
      setDenied(e?.name === "NotAllowedError" || e?.name === "SecurityError");
      setStatus("error");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setMicStream(null);
    setStatus("idle");
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, micStream, status, denied, start, stop };
}
